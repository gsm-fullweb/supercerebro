#!/usr/bin/env bash
set -euo pipefail

TS="$(date +%Y%m%d_%H%M%S)"
BACKUP_DIR="/root/chathook-backups"
CONTACTS_CSV="/tmp/chatwoot_contacts_${TS}.csv"
REMOTE_CONTACTS_CSV="/tmp/chatwoot_contacts_sync.csv"

CW_CONTAINER="$(docker ps --filter name=postgree_postgres -q | head -1)"
KB_CONTAINER="$(docker ps --filter name=kanbanscript_postgres-kanban -q | head -1)"

if [[ -z "${CW_CONTAINER}" || -z "${KB_CONTAINER}" ]]; then
  echo "ERROR: containers not found" >&2
  exit 1
fi

mkdir -p "${BACKUP_DIR}"

echo "== Backup Patient =="
PATIENT_BACKUP="${BACKUP_DIR}/Patient_before_all_accounts_contact_sync_${TS}.sql"
docker exec "${KB_CONTAINER}" pg_dump -U kanbancw -d kanbancw -t '"Patient"' > "${PATIENT_BACKUP}"
echo "${PATIENT_BACKUP}"

echo "== Export Chatwoot contacts =="
docker exec "${CW_CONTAINER}" psql -U postgres -d chatwoot -v ON_ERROR_STOP=1 -c "\copy (
  SELECT
    id,
    account_id,
    COALESCE(name, '') AS name,
    COALESCE(phone_number, '') AS phone_number,
    COALESCE(email, '') AS email,
    COALESCE(identifier, '') AS identifier
  FROM contacts
  ORDER BY account_id, id
) TO STDOUT WITH CSV" > "${CONTACTS_CSV}"
docker cp "${CONTACTS_CSV}" "${KB_CONTAINER}:${REMOTE_CONTACTS_CSV}"

echo "== Plan before sync =="
docker exec -i "${KB_CONTAINER}" psql -U kanbancw -d kanbancw -v ON_ERROR_STOP=1 <<'SQL'
DROP TABLE IF EXISTS tmp_chatwoot_contacts_import;
CREATE TEMP TABLE tmp_chatwoot_contacts_import (
  id int,
  account_id int,
  name text,
  phone_number text,
  email text,
  identifier text
);
\copy tmp_chatwoot_contacts_import FROM '/tmp/chatwoot_contacts_sync.csv' WITH CSV

CREATE TEMP TABLE tmp_chatwoot_contacts_prepared AS
SELECT
  id,
  account_id,
  NULLIF(BTRIM(name), '') AS raw_name,
  NULLIF(BTRIM(phone_number), '') AS raw_phone,
  NULLIF(BTRIM(email), '') AS raw_email,
  NULLIF(BTRIM(identifier), '') AS raw_identifier,
  REGEXP_REPLACE(COALESCE(phone_number, ''), '\D', '', 'g') AS normalized_phone,
  CASE
    WHEN NULLIF(BTRIM(name), '') IS NULL
      OR BTRIM(name) ~ '^\.+$'
      OR BTRIM(name) ~* '@(lid|c\.us)$'
      OR BTRIM(name) ~* '^status@broadcast$'
      OR BTRIM(name) ~* '^whatsapp\.integration$'
    THEN
      CASE
        WHEN REGEXP_REPLACE(COALESCE(phone_number, ''), '\D', '', 'g') <> ''
          THEN 'Cliente +' || REGEXP_REPLACE(COALESCE(phone_number, ''), '\D', '', 'g')
        WHEN NULLIF(BTRIM(email), '') IS NOT NULL
          THEN BTRIM(email)
        ELSE 'Contato #' || id::text
      END
    ELSE BTRIM(name)
  END AS best_name
FROM tmp_chatwoot_contacts_import;

WITH contact_totals AS (
  SELECT account_id, COUNT(*) AS contacts
  FROM tmp_chatwoot_contacts_prepared
  GROUP BY account_id
),
patient_totals AS (
  SELECT "accountId" AS account_id, COUNT(*) AS patients
  FROM "Patient"
  GROUP BY "accountId"
),
already_by_contact AS (
  SELECT c.account_id, COUNT(*) AS already_linked
  FROM tmp_chatwoot_contacts_prepared c
  JOIN "Patient" p
    ON p."accountId" = c.account_id
   AND p."chatwootContactId" = c.id
  GROUP BY c.account_id
),
linkable_by_phone AS (
  SELECT c.account_id, COUNT(*) AS linkable
  FROM tmp_chatwoot_contacts_prepared c
  JOIN "Patient" p
    ON p."accountId" = c.account_id
   AND p."chatwootContactId" IS NULL
   AND c.normalized_phone <> ''
   AND REGEXP_REPLACE(COALESCE(p.phone, ''), '\D', '', 'g') = c.normalized_phone
  WHERE NOT EXISTS (
    SELECT 1 FROM "Patient" p2
    WHERE p2."accountId" = c.account_id
      AND p2."chatwootContactId" = c.id
  )
  GROUP BY c.account_id
),
insertable AS (
  SELECT c.account_id, COUNT(*) AS to_insert
  FROM tmp_chatwoot_contacts_prepared c
  WHERE NOT EXISTS (
    SELECT 1 FROM "Patient" p
    WHERE p."accountId" = c.account_id
      AND p."chatwootContactId" = c.id
  )
  AND (
    c.normalized_phone = ''
    OR NOT EXISTS (
      SELECT 1 FROM "Patient" p
      WHERE p."accountId" = c.account_id
        AND REGEXP_REPLACE(COALESCE(p.phone, ''), '\D', '', 'g') = c.normalized_phone
    )
  )
  GROUP BY c.account_id
)
SELECT
  ct.account_id,
  ct.contacts,
  COALESCE(pt.patients, 0) AS patients_before,
  COALESCE(abc.already_linked, 0) AS already_linked,
  COALESCE(lbp.linkable, 0) AS linkable_by_phone,
  COALESCE(i.to_insert, 0) AS to_insert
FROM contact_totals ct
LEFT JOIN patient_totals pt USING (account_id)
LEFT JOIN already_by_contact abc USING (account_id)
LEFT JOIN linkable_by_phone lbp USING (account_id)
LEFT JOIN insertable i USING (account_id)
ORDER BY ct.account_id;
SQL

echo "== Apply sync =="
docker exec -i "${KB_CONTAINER}" psql -U kanbancw -d kanbancw -v ON_ERROR_STOP=1 <<'SQL'
BEGIN;

DROP TABLE IF EXISTS tmp_chatwoot_contacts_import;
CREATE TEMP TABLE tmp_chatwoot_contacts_import (
  id int,
  account_id int,
  name text,
  phone_number text,
  email text,
  identifier text
);
\copy tmp_chatwoot_contacts_import FROM '/tmp/chatwoot_contacts_sync.csv' WITH CSV

CREATE TEMP TABLE tmp_chatwoot_contacts_prepared AS
SELECT
  id,
  account_id,
  NULLIF(BTRIM(name), '') AS raw_name,
  NULLIF(BTRIM(phone_number), '') AS raw_phone,
  NULLIF(BTRIM(email), '') AS raw_email,
  NULLIF(BTRIM(identifier), '') AS raw_identifier,
  REGEXP_REPLACE(COALESCE(phone_number, ''), '\D', '', 'g') AS normalized_phone,
  CASE
    WHEN NULLIF(BTRIM(name), '') IS NULL
      OR BTRIM(name) ~ '^\.+$'
      OR BTRIM(name) ~* '@(lid|c\.us)$'
      OR BTRIM(name) ~* '^status@broadcast$'
      OR BTRIM(name) ~* '^whatsapp\.integration$'
    THEN
      CASE
        WHEN REGEXP_REPLACE(COALESCE(phone_number, ''), '\D', '', 'g') <> ''
          THEN 'Cliente +' || REGEXP_REPLACE(COALESCE(phone_number, ''), '\D', '', 'g')
        WHEN NULLIF(BTRIM(email), '') IS NOT NULL
          THEN BTRIM(email)
        ELSE 'Contato #' || id::text
      END
    ELSE BTRIM(name)
  END AS best_name
FROM tmp_chatwoot_contacts_import;

WITH unique_contacts_by_phone AS (
  SELECT DISTINCT ON (account_id, normalized_phone)
    id,
    account_id,
    normalized_phone
  FROM tmp_chatwoot_contacts_prepared
  WHERE normalized_phone <> ''
  ORDER BY account_id, normalized_phone, id
),
link_candidates AS (
  SELECT DISTINCT ON (p.id)
    p.id AS patient_id,
    c.id AS contact_id
  FROM "Patient" p
  JOIN unique_contacts_by_phone c
    ON c.account_id = p."accountId"
   AND c.normalized_phone = REGEXP_REPLACE(COALESCE(p.phone, ''), '\D', '', 'g')
  WHERE p."chatwootContactId" IS NULL
    AND NOT EXISTS (
      SELECT 1 FROM "Patient" p2
      WHERE p2."accountId" = p."accountId"
        AND p2."chatwootContactId" = c.id
    )
  ORDER BY p.id, c.id
),
linked AS (
  UPDATE "Patient" p
  SET "chatwootContactId" = lc.contact_id,
      "updatedAt" = NOW()
  FROM link_candidates lc
  WHERE p.id = lc.patient_id
  RETURNING p.id
)
SELECT COUNT(*) AS linked_by_phone FROM linked;

WITH inserted AS (
  INSERT INTO "Patient" (
    "accountId",
    name,
    phone,
    email,
    "chatwootContactId",
    "createdAt",
    "updatedAt"
  )
  SELECT
    c.account_id,
    c.best_name,
    COALESCE(c.raw_phone, ''),
    c.raw_email,
    c.id,
    NOW(),
    NOW()
  FROM tmp_chatwoot_contacts_prepared c
  WHERE NOT EXISTS (
    SELECT 1 FROM "Patient" p
    WHERE p."accountId" = c.account_id
      AND p."chatwootContactId" = c.id
  )
  AND (
    c.normalized_phone = ''
    OR NOT EXISTS (
      SELECT 1 FROM "Patient" p
      WHERE p."accountId" = c.account_id
        AND REGEXP_REPLACE(COALESCE(p.phone, ''), '\D', '', 'g') = c.normalized_phone
    )
  )
  RETURNING "accountId"
)
SELECT "accountId", COUNT(*) AS inserted
FROM inserted
GROUP BY "accountId"
ORDER BY "accountId";

COMMIT;
SQL

echo "== Final totals =="
docker exec -i "${KB_CONTAINER}" psql -U kanbancw -d kanbancw -v ON_ERROR_STOP=1 <<'SQL'
SELECT "accountId", COUNT(*) AS patients, COUNT("chatwootContactId") AS linked_contacts
FROM "Patient"
GROUP BY "accountId"
ORDER BY "accountId";

SELECT COUNT(*) AS total_patients, COUNT(DISTINCT "accountId") AS accounts_with_patients
FROM "Patient";
SQL

docker exec "${KB_CONTAINER}" rm -f "${REMOTE_CONTACTS_CSV}" >/dev/null 2>&1 || true
rm -f "${CONTACTS_CSV}"
