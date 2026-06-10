"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const database_1 = __importDefault(require("../services/database"));
const logger_1 = __importDefault(require("../utils/logger"));
const router = (0, express_1.Router)();
function isAdmin(req) {
    const authReq = req;
    const role = authReq.user?.role;
    return role === 'administrator' || role === 1;
}
function getAccount(req) {
    return req.user.account_id;
}
function getUser(req) {
    return req.user.id;
}
// ============================================================
// PATIENTS
// ============================================================
// GET /api/appointments/patients
router.get('/patients', async (req, res) => {
    const accountId = getAccount(req);
    const { search, page = '1', limit = '50' } = req.query;
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 50));
    const skip = (pageNum - 1) * limitNum;
    const where = { accountId };
    if (search) {
        where.OR = [
            { name: { contains: search, mode: 'insensitive' } },
            { phone: { contains: search } },
            { cpf: { contains: search } },
        ];
    }
    try {
        const [patients, total] = await Promise.all([
            database_1.default.patient.findMany({
                where,
                orderBy: { name: 'asc' },
                skip,
                take: limitNum,
                include: { _count: { select: { appointments: true } }, healthPlan: true },
            }),
            database_1.default.patient.count({ where }),
        ]);
        const totalPages = Math.max(1, Math.ceil(total / limitNum));
        res.json({ data: patients, total, page: pageNum, limit: limitNum, totalPages, hasMore: pageNum < totalPages });
    }
    catch (error) {
        logger_1.default.error('Error fetching patients', { error });
        res.status(500).json({ error: 'Failed to fetch patients' });
    }
});
// GET /api/appointments/patients/by-phone/:phone
router.get('/patients/by-phone/:phone', async (req, res) => {
    const accountId = getAccount(req);
    const phone = req.params.phone.replace(/\D/g, '');
    try {
        const patient = await database_1.default.patient.findFirst({
            where: { accountId, phone: { contains: phone } },
            include: {
                appointments: {
                    orderBy: { appointmentAt: 'desc' },
                    take: 10,
                    include: { practitioner: true, service: true },
                },
            },
        });
        res.json({ data: patient });
    }
    catch (error) {
        logger_1.default.error('Error fetching patient by phone', { error });
        res.status(500).json({ error: 'Failed to fetch patient' });
    }
});
// GET /api/appointments/patients/:id
router.get('/patients/:id', async (req, res) => {
    const accountId = getAccount(req);
    const id = parseInt(req.params.id);
    try {
        const patient = await database_1.default.patient.findFirst({
            where: { id, accountId },
            include: {
                appointments: {
                    orderBy: { appointmentAt: 'desc' },
                    include: { practitioner: true, service: true, healthPlan: true },
                },
            },
        });
        if (!patient)
            return res.status(404).json({ error: 'Patient not found' });
        res.json({ data: patient });
    }
    catch (error) {
        logger_1.default.error('Error fetching patient', { error });
        res.status(500).json({ error: 'Failed to fetch patient' });
    }
});
// POST /api/appointments/patients
router.post('/patients', async (req, res) => {
    const accountId = getAccount(req);
    const { name, phone, email, cpf, birthDate, address, emergencyContact, healthPlanId, notes, chatwootContactId } = req.body;
    if (!name || !phone)
        return res.status(400).json({ error: 'name and phone are required' });
    try {
        const patient = await database_1.default.patient.create({
            data: {
                accountId, name, phone,
                email: email || null,
                cpf: cpf || null,
                birthDate: birthDate ? new Date(birthDate) : null,
                address: address || null,
                emergencyContact: emergencyContact || null,
                healthPlanId: healthPlanId ? parseInt(healthPlanId) : null,
                notes: notes || null,
                chatwootContactId: chatwootContactId ? parseInt(chatwootContactId) : null,
            },
        });
        res.status(201).json({ data: patient });
    }
    catch (error) {
        logger_1.default.error('Error creating patient', { error });
        res.status(500).json({ error: 'Failed to create patient' });
    }
});
// PUT /api/appointments/patients/:id
router.put('/patients/:id', async (req, res) => {
    const accountId = getAccount(req);
    const id = parseInt(req.params.id);
    const { name, phone, email, cpf, birthDate, address, emergencyContact, healthPlanId, notes, chatwootContactId } = req.body;
    try {
        const existing = await database_1.default.patient.findFirst({ where: { id, accountId } });
        if (!existing)
            return res.status(404).json({ error: 'Patient not found' });
        const patient = await database_1.default.patient.update({
            where: { id },
            data: {
                ...(name && { name }),
                ...(phone && { phone }),
                ...(email !== undefined && { email }),
                ...(cpf !== undefined && { cpf }),
                ...(birthDate !== undefined && { birthDate: birthDate ? new Date(birthDate) : null }),
                ...(address !== undefined && { address }),
                ...(emergencyContact !== undefined && { emergencyContact }),
                ...(healthPlanId !== undefined && { healthPlanId: healthPlanId ? parseInt(healthPlanId) : null }),
                ...(notes !== undefined && { notes }),
                ...(chatwootContactId !== undefined && { chatwootContactId: chatwootContactId ? parseInt(chatwootContactId) : null }),
            },
        });
        res.json({ data: patient });
    }
    catch (error) {
        logger_1.default.error('Error updating patient', { error });
        res.status(500).json({ error: 'Failed to update patient' });
    }
});
// DELETE /api/appointments/patients/:id (admin only)
router.delete('/patients/:id', async (req, res) => {
    if (!isAdmin(req))
        return res.status(403).json({ error: 'Admin required' });
    const accountId = getAccount(req);
    const id = parseInt(req.params.id);
    try {
        const existing = await database_1.default.patient.findFirst({ where: { id, accountId } });
        if (!existing)
            return res.status(404).json({ error: 'Patient not found' });
        await database_1.default.patient.delete({ where: { id } });
        res.json({ success: true });
    }
    catch (error) {
        logger_1.default.error('Error deleting patient', { error });
        res.status(500).json({ error: 'Failed to delete patient' });
    }
});
// ============================================================
// PRACTITIONERS
// ============================================================
// GET /api/appointments/practitioners
router.get('/practitioners', async (req, res) => {
    const accountId = getAccount(req);
    try {
        const practitioners = await database_1.default.practitioner.findMany({
            where: { accountId, isActive: true },
            orderBy: { name: 'asc' },
            include: { services: { include: { service: true } } },
        });
        res.json({ data: practitioners });
    }
    catch (error) {
        logger_1.default.error('Error fetching practitioners', { error });
        res.status(500).json({ error: 'Failed to fetch practitioners' });
    }
});
// GET /api/appointments/practitioners/:id/slots
// Retorna slots disponíveis para um profissional em uma data
router.get('/practitioners/:id/slots', async (req, res) => {
    const accountId = getAccount(req);
    const practitionerId = parseInt(req.params.id);
    const { date, serviceId } = req.query;
    if (!date)
        return res.status(400).json({ error: 'date is required' });
    try {
        const practitioner = await database_1.default.practitioner.findFirst({
            where: { id: practitionerId, accountId, isActive: true },
        });
        if (!practitioner)
            return res.status(404).json({ error: 'Practitioner not found' });
        const service = serviceId
            ? await database_1.default.appointmentService.findFirst({ where: { id: parseInt(serviceId), accountId } })
            : null;
        const duration = service?.durationMinutes ?? 60;
        const preparation = service?.preparationMinutes ?? 0;
        const targetDate = new Date(date + 'T00:00:00');
        const dayOfWeek = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sab'][targetDate.getDay()];
        // Parse working hours
        let workingHours = [];
        try {
            workingHours = practitioner.workingHours ? JSON.parse(practitioner.workingHours) : [];
        }
        catch {
            workingHours = [];
        }
        const daySchedule = workingHours.find(w => w.day === dayOfWeek);
        if (!daySchedule)
            return res.json({ data: [] });
        // Gera slots de acordo com o horário de trabalho
        const slots = [];
        const [startH, startM] = daySchedule.startTime.split(':').map(Number);
        const [endH, endM] = daySchedule.endTime.split(':').map(Number);
        let current = startH * 60 + startM;
        const end = endH * 60 + endM;
        while (current + duration + preparation <= end) {
            const h = Math.floor(current / 60).toString().padStart(2, '0');
            const m = (current % 60).toString().padStart(2, '0');
            slots.push(`${h}:${m}`);
            current += duration + preparation + practitioner.bufferMinutes;
        }
        // Remove slots ocupados
        const dayStart = new Date(date + 'T00:00:00');
        const dayEnd = new Date(date + 'T23:59:59');
        const existing = await database_1.default.appointment.findMany({
            where: {
                accountId,
                practitionerId,
                appointmentAt: { gte: dayStart, lte: dayEnd },
                status: { notIn: ['cancelled', 'missed'] },
            },
        });
        const blocks = await database_1.default.practitionerBlock.findMany({
            where: { accountId, practitionerId, startsAt: { lte: dayEnd }, endsAt: { gte: dayStart } },
        });
        // Intervalo de almoço em minutos desde meia-noite
        let lunchStartMin = null;
        let lunchEndMin = null;
        if (practitioner.lunchStart && practitioner.lunchEnd) {
            const [lh, lm] = practitioner.lunchStart.split(':').map(Number);
            const [leh, lem] = practitioner.lunchEnd.split(':').map(Number);
            lunchStartMin = lh * 60 + lm;
            lunchEndMin = leh * 60 + lem;
        }
        const availableSlots = slots.filter(slot => {
            const slotStart = new Date(date + `T${slot}:00`);
            const slotEnd = new Date(slotStart.getTime() + duration * 60000);
            const [sh, sm] = slot.split(':').map(Number);
            const slotStartMin = sh * 60 + sm;
            const slotEndMin = slotStartMin + duration;
            // Conflito com horário de almoço
            if (lunchStartMin !== null && lunchEndMin !== null) {
                if (slotStartMin < lunchEndMin && slotEndMin > lunchStartMin)
                    return false;
            }
            const conflictsAppointment = existing.some(a => {
                return slotStart < a.endsAt && slotEnd > a.appointmentAt;
            });
            const conflictsBlock = blocks.some(b => {
                return slotStart < b.endsAt && slotEnd > b.startsAt;
            });
            return !conflictsAppointment && !conflictsBlock;
        });
        res.json({ data: availableSlots });
    }
    catch (error) {
        logger_1.default.error('Error fetching slots', { error });
        res.status(500).json({ error: 'Failed to fetch slots' });
    }
});
// GET /api/appointments/practitioners/:id
router.get('/practitioners/:id', async (req, res) => {
    const accountId = getAccount(req);
    const id = parseInt(req.params.id);
    try {
        const practitioner = await database_1.default.practitioner.findFirst({
            where: { id, accountId },
            include: { services: { include: { service: true } } },
        });
        if (!practitioner)
            return res.status(404).json({ error: 'Practitioner not found' });
        res.json({ data: practitioner });
    }
    catch (error) {
        logger_1.default.error('Error fetching practitioner', { error });
        res.status(500).json({ error: 'Failed to fetch practitioner' });
    }
});
// POST /api/appointments/practitioners
router.post('/practitioners', async (req, res) => {
    if (!isAdmin(req))
        return res.status(403).json({ error: 'Admin required' });
    const accountId = getAccount(req);
    const { name, specialty, registrationNo, email, phone, color, workingHours, bufferMinutes, lunchStart, lunchEnd, chatwootUserId, serviceIds } = req.body;
    if (!name)
        return res.status(400).json({ error: 'name is required' });
    try {
        const practitioner = await database_1.default.practitioner.create({
            data: {
                accountId, name,
                specialty: specialty || null,
                registrationNo: registrationNo || null,
                email: email || null,
                phone: phone || null,
                color: color || '#6366F1',
                workingHours: workingHours ? JSON.stringify(workingHours) : null,
                bufferMinutes: bufferMinutes ?? 0,
                lunchStart: lunchStart || null,
                lunchEnd: lunchEnd || null,
                chatwootUserId: chatwootUserId ? parseInt(chatwootUserId) : null,
                ...(serviceIds && Array.isArray(serviceIds) && {
                    services: {
                        create: serviceIds.map((id) => ({ serviceId: id })),
                    },
                }),
            },
            include: { services: { include: { service: true } } },
        });
        res.status(201).json({ data: practitioner });
    }
    catch (error) {
        logger_1.default.error('Error creating practitioner', { error });
        res.status(500).json({ error: 'Failed to create practitioner' });
    }
});
// PUT /api/appointments/practitioners/:id
router.put('/practitioners/:id', async (req, res) => {
    if (!isAdmin(req))
        return res.status(403).json({ error: 'Admin required' });
    const accountId = getAccount(req);
    const id = parseInt(req.params.id);
    const { name, specialty, registrationNo, email, phone, color, workingHours, bufferMinutes, lunchStart, lunchEnd, isActive, chatwootUserId, serviceIds } = req.body;
    try {
        const existing = await database_1.default.practitioner.findFirst({ where: { id, accountId } });
        if (!existing)
            return res.status(404).json({ error: 'Practitioner not found' });
        const practitioner = await database_1.default.practitioner.update({
            where: { id },
            data: {
                ...(name && { name }),
                ...(specialty !== undefined && { specialty }),
                ...(registrationNo !== undefined && { registrationNo }),
                ...(email !== undefined && { email }),
                ...(phone !== undefined && { phone }),
                ...(color && { color }),
                ...(workingHours !== undefined && { workingHours: workingHours ? JSON.stringify(workingHours) : null }),
                ...(bufferMinutes !== undefined && { bufferMinutes }),
                ...(lunchStart !== undefined && { lunchStart: lunchStart || null }),
                ...(lunchEnd !== undefined && { lunchEnd: lunchEnd || null }),
                ...(isActive !== undefined && { isActive }),
                ...(chatwootUserId !== undefined && { chatwootUserId: chatwootUserId ? parseInt(chatwootUserId) : null }),
            },
            include: { services: { include: { service: true } } },
        });
        // Atualiza serviços associados se fornecido
        if (serviceIds !== undefined && Array.isArray(serviceIds)) {
            await database_1.default.practitionerService.deleteMany({ where: { practitionerId: id } });
            if (serviceIds.length > 0) {
                await database_1.default.practitionerService.createMany({
                    data: serviceIds.map((sid) => ({ practitionerId: id, serviceId: sid })),
                });
            }
        }
        // Buscar novamente com services atualizados
        const updated = await database_1.default.practitioner.findFirst({
            where: { id },
            include: { services: { include: { service: true } } },
        });
        res.json({ data: updated });
    }
    catch (error) {
        logger_1.default.error('Error updating practitioner', { error });
        res.status(500).json({ error: 'Failed to update practitioner' });
    }
});
// DELETE /api/appointments/practitioners/:id — soft delete
router.delete('/practitioners/:id', async (req, res) => {
    if (!isAdmin(req))
        return res.status(403).json({ error: 'Admin required' });
    const accountId = getAccount(req);
    const id = parseInt(req.params.id);
    try {
        const existing = await database_1.default.practitioner.findFirst({ where: { id, accountId } });
        if (!existing)
            return res.status(404).json({ error: 'Practitioner not found' });
        await database_1.default.practitioner.update({ where: { id }, data: { isActive: false } });
        res.json({ success: true });
    }
    catch (error) {
        logger_1.default.error('Error deleting practitioner', { error });
        res.status(500).json({ error: 'Failed to delete practitioner' });
    }
});
// POST /api/appointments/practitioners/:id/blocks
router.post('/practitioners/:id/blocks', async (req, res) => {
    if (!isAdmin(req))
        return res.status(403).json({ error: 'Admin required' });
    const accountId = getAccount(req);
    const practitionerId = parseInt(req.params.id);
    const { startsAt, endsAt, reason, isRecurring, recurringRule } = req.body;
    if (!startsAt || !endsAt)
        return res.status(400).json({ error: 'startsAt and endsAt required' });
    try {
        const block = await database_1.default.practitionerBlock.create({
            data: {
                accountId, practitionerId,
                startsAt: new Date(startsAt),
                endsAt: new Date(endsAt),
                reason: reason || null,
                isRecurring: isRecurring ?? false,
                recurringRule: recurringRule || null,
            },
        });
        res.status(201).json({ data: block });
    }
    catch (error) {
        logger_1.default.error('Error creating block', { error });
        res.status(500).json({ error: 'Failed to create block' });
    }
});
// DELETE /api/appointments/practitioners/:id/blocks/:blockId
router.delete('/practitioners/:id/blocks/:blockId', async (req, res) => {
    if (!isAdmin(req))
        return res.status(403).json({ error: 'Admin required' });
    const accountId = getAccount(req);
    const blockId = parseInt(req.params.blockId);
    try {
        const block = await database_1.default.practitionerBlock.findFirst({ where: { id: blockId, accountId } });
        if (!block)
            return res.status(404).json({ error: 'Block not found' });
        await database_1.default.practitionerBlock.delete({ where: { id: blockId } });
        res.json({ success: true });
    }
    catch (error) {
        logger_1.default.error('Error deleting block', { error });
        res.status(500).json({ error: 'Failed to delete block' });
    }
});
// ============================================================
// SERVICES
// ============================================================
// GET /api/appointments/services
router.get('/services', async (req, res) => {
    const accountId = getAccount(req);
    try {
        const services = await database_1.default.appointmentService.findMany({
            where: { accountId, isActive: true },
            orderBy: { name: 'asc' },
            include: {
                practitioners: { include: { practitioner: true } },
                serviceReminders: { where: { isActive: true }, orderBy: [{ order: 'asc' }, { createdAt: 'asc' }] },
            },
        });
        res.json({ data: services });
    }
    catch (error) {
        logger_1.default.error('Error fetching services', { error });
        res.status(500).json({ error: 'Failed to fetch services' });
    }
});
// GET /api/appointments/services/:id
router.get('/services/:id', async (req, res) => {
    const accountId = getAccount(req);
    const id = parseInt(req.params.id);
    try {
        const service = await database_1.default.appointmentService.findFirst({
            where: { id, accountId },
            include: {
                practitioners: { include: { practitioner: true } },
                serviceReminders: { orderBy: [{ order: 'asc' }, { createdAt: 'asc' }] },
            },
        });
        if (!service)
            return res.status(404).json({ error: 'Service not found' });
        res.json({ data: service });
    }
    catch (error) {
        logger_1.default.error('Error fetching service', { error });
        res.status(500).json({ error: 'Failed to fetch service' });
    }
});
// POST /api/appointments/services
router.post('/services', async (req, res) => {
    if (!isAdmin(req))
        return res.status(403).json({ error: 'Admin required' });
    const accountId = getAccount(req);
    const { name, description, durationMinutes, preparationMinutes, color, defaultPrice, isOnline } = req.body;
    if (!name)
        return res.status(400).json({ error: 'name is required' });
    try {
        const service = await database_1.default.appointmentService.create({
            data: {
                accountId, name,
                description: description || null,
                durationMinutes: durationMinutes ?? 60,
                preparationMinutes: preparationMinutes ?? 0,
                color: color || '#10B981',
                defaultPrice: defaultPrice ?? null,
                isOnline: isOnline ?? true,
            },
        });
        res.status(201).json({ data: service });
    }
    catch (error) {
        logger_1.default.error('Error creating service', { error });
        res.status(500).json({ error: 'Failed to create service' });
    }
});
// PUT /api/appointments/services/:id
router.put('/services/:id', async (req, res) => {
    if (!isAdmin(req))
        return res.status(403).json({ error: 'Admin required' });
    const accountId = getAccount(req);
    const id = parseInt(req.params.id);
    const { name, description, durationMinutes, preparationMinutes, color, defaultPrice, isOnline, isActive } = req.body;
    try {
        const existing = await database_1.default.appointmentService.findFirst({ where: { id, accountId } });
        if (!existing)
            return res.status(404).json({ error: 'Service not found' });
        const service = await database_1.default.appointmentService.update({
            where: { id },
            data: {
                ...(name && { name }),
                ...(description !== undefined && { description }),
                ...(durationMinutes !== undefined && { durationMinutes }),
                ...(preparationMinutes !== undefined && { preparationMinutes }),
                ...(color && { color }),
                ...(defaultPrice !== undefined && { defaultPrice }),
                ...(isOnline !== undefined && { isOnline }),
                ...(isActive !== undefined && { isActive }),
            },
        });
        res.json({ data: service });
    }
    catch (error) {
        logger_1.default.error('Error updating service', { error });
        res.status(500).json({ error: 'Failed to update service' });
    }
});
// DELETE /api/appointments/services/:id
router.delete('/services/:id', async (req, res) => {
    if (!isAdmin(req))
        return res.status(403).json({ error: 'Admin required' });
    const accountId = getAccount(req);
    const id = parseInt(req.params.id);
    try {
        const existing = await database_1.default.appointmentService.findFirst({ where: { id, accountId } });
        if (!existing)
            return res.status(404).json({ error: 'Service not found' });
        await database_1.default.appointmentService.update({ where: { id }, data: { isActive: false } });
        res.json({ success: true });
    }
    catch (error) {
        logger_1.default.error('Error deleting service', { error });
        res.status(500).json({ error: 'Failed to delete service' });
    }
});
// ============================================================
// SERVICE REMINDERS
// ============================================================
// GET /api/appointments/services/:id/reminders
router.get('/services/:id/reminders', async (req, res) => {
    const accountId = getAccount(req);
    const serviceId = parseInt(req.params.id);
    try {
        const service = await database_1.default.appointmentService.findFirst({ where: { id: serviceId, accountId } });
        if (!service)
            return res.status(404).json({ error: 'Service not found' });
        const reminders = await database_1.default.serviceReminder.findMany({
            where: { serviceId, accountId },
            orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
        });
        res.json({ data: reminders });
    }
    catch (error) {
        logger_1.default.error('Error fetching service reminders', { error });
        res.status(500).json({ error: 'Failed to fetch service reminders' });
    }
});
// POST /api/appointments/services/:id/reminders
router.post('/services/:id/reminders', async (req, res) => {
    if (!isAdmin(req))
        return res.status(403).json({ error: 'Admin required' });
    const accountId = getAccount(req);
    const serviceId = parseInt(req.params.id);
    const { label, timing, daysBefore, hoursBefore, minutesBefore, message, isActive, order, inboxId, waTemplateName, waTemplateLang, waTemplateParams } = req.body;
    if (!label)
        return res.status(400).json({ error: 'label is required' });
    if (!message && !waTemplateName)
        return res.status(400).json({ error: 'message or waTemplateName is required' });
    try {
        const service = await database_1.default.appointmentService.findFirst({ where: { id: serviceId, accountId } });
        if (!service)
            return res.status(404).json({ error: 'Service not found' });
        const reminder = await database_1.default.serviceReminder.create({
            data: {
                serviceId,
                accountId,
                inboxId: inboxId ? parseInt(inboxId) : null,
                label,
                timing: timing || 'before',
                daysBefore: daysBefore ?? 0,
                hoursBefore: hoursBefore ?? 24,
                minutesBefore: minutesBefore ?? 0,
                message: message || '',
                isActive: isActive ?? true,
                order: order ?? 0,
                waTemplateName: waTemplateName || null,
                waTemplateLang: waTemplateLang || null,
                waTemplateParams: waTemplateParams ? JSON.stringify(waTemplateParams) : null,
            },
        });
        res.status(201).json({ data: reminder });
    }
    catch (error) {
        logger_1.default.error('Error creating service reminder', { error });
        res.status(500).json({ error: 'Failed to create service reminder' });
    }
});
// PUT /api/appointments/services/:serviceId/reminders/:reminderId
router.put('/services/:serviceId/reminders/:reminderId', async (req, res) => {
    if (!isAdmin(req))
        return res.status(403).json({ error: 'Admin required' });
    const accountId = getAccount(req);
    const serviceId = parseInt(req.params.serviceId);
    const reminderId = parseInt(req.params.reminderId);
    const { label, timing, daysBefore, hoursBefore, minutesBefore, message, isActive, order, inboxId, waTemplateName, waTemplateLang, waTemplateParams } = req.body;
    try {
        const existing = await database_1.default.serviceReminder.findFirst({ where: { id: reminderId, serviceId, accountId } });
        if (!existing)
            return res.status(404).json({ error: 'Reminder not found' });
        const reminder = await database_1.default.serviceReminder.update({
            where: { id: reminderId },
            data: {
                ...(label !== undefined && { label }),
                ...(timing !== undefined && { timing }),
                ...(daysBefore !== undefined && { daysBefore }),
                ...(hoursBefore !== undefined && { hoursBefore }),
                ...(minutesBefore !== undefined && { minutesBefore }),
                ...(message !== undefined && { message }),
                ...(isActive !== undefined && { isActive }),
                ...(order !== undefined && { order }),
                inboxId: inboxId !== undefined ? (inboxId ? parseInt(inboxId) : null) : undefined,
                waTemplateName: waTemplateName !== undefined ? (waTemplateName || null) : undefined,
                waTemplateLang: waTemplateLang !== undefined ? (waTemplateLang || null) : undefined,
                waTemplateParams: waTemplateParams !== undefined
                    ? (waTemplateParams ? JSON.stringify(waTemplateParams) : null)
                    : undefined,
            },
        });
        res.json({ data: reminder });
    }
    catch (error) {
        logger_1.default.error('Error updating service reminder', { error });
        res.status(500).json({ error: 'Failed to update service reminder' });
    }
});
// DELETE /api/appointments/services/:serviceId/reminders/:reminderId
router.delete('/services/:serviceId/reminders/:reminderId', async (req, res) => {
    if (!isAdmin(req))
        return res.status(403).json({ error: 'Admin required' });
    const accountId = getAccount(req);
    const serviceId = parseInt(req.params.serviceId);
    const reminderId = parseInt(req.params.reminderId);
    try {
        const existing = await database_1.default.serviceReminder.findFirst({ where: { id: reminderId, serviceId, accountId } });
        if (!existing)
            return res.status(404).json({ error: 'Reminder not found' });
        await database_1.default.serviceReminder.delete({ where: { id: reminderId } });
        res.json({ success: true });
    }
    catch (error) {
        logger_1.default.error('Error deleting service reminder', { error });
        res.status(500).json({ error: 'Failed to delete service reminder' });
    }
});
// ============================================================
// HEALTH PLANS
// ============================================================
// GET /api/appointments/health-plans
router.get('/health-plans', async (req, res) => {
    const accountId = getAccount(req);
    try {
        const plans = await database_1.default.healthPlan.findMany({
            where: { accountId, isActive: true },
            orderBy: { name: 'asc' },
        });
        res.json({ data: plans });
    }
    catch (error) {
        logger_1.default.error('Error fetching health plans', { error });
        res.status(500).json({ error: 'Failed to fetch health plans' });
    }
});
// GET /api/appointments/health-plans/:id
router.get('/health-plans/:id', async (req, res) => {
    const accountId = getAccount(req);
    const id = parseInt(req.params.id);
    try {
        const plan = await database_1.default.healthPlan.findFirst({ where: { id, accountId } });
        if (!plan)
            return res.status(404).json({ error: 'Health plan not found' });
        res.json({ data: plan });
    }
    catch (error) {
        logger_1.default.error('Error fetching health plan', { error });
        res.status(500).json({ error: 'Failed to fetch health plan' });
    }
});
// POST /api/appointments/health-plans
router.post('/health-plans', async (req, res) => {
    if (!isAdmin(req))
        return res.status(403).json({ error: 'Admin required' });
    const accountId = getAccount(req);
    const { name, type, ansCode, paymentDays, requiresAuth, sessionsLimit, notes } = req.body;
    if (!name)
        return res.status(400).json({ error: 'name is required' });
    try {
        const plan = await database_1.default.healthPlan.create({
            data: {
                accountId, name,
                type: type || 'particular',
                ansCode: ansCode || null,
                paymentDays: paymentDays ?? 30,
                requiresAuth: requiresAuth ?? false,
                sessionsLimit: sessionsLimit ?? null,
                notes: notes || null,
            },
        });
        res.status(201).json({ data: plan });
    }
    catch (error) {
        logger_1.default.error('Error creating health plan', { error });
        res.status(500).json({ error: 'Failed to create health plan' });
    }
});
// PUT /api/appointments/health-plans/:id
router.put('/health-plans/:id', async (req, res) => {
    if (!isAdmin(req))
        return res.status(403).json({ error: 'Admin required' });
    const accountId = getAccount(req);
    const id = parseInt(req.params.id);
    const { name, type, ansCode, paymentDays, requiresAuth, sessionsLimit, notes, isActive } = req.body;
    try {
        const existing = await database_1.default.healthPlan.findFirst({ where: { id, accountId } });
        if (!existing)
            return res.status(404).json({ error: 'Health plan not found' });
        const plan = await database_1.default.healthPlan.update({
            where: { id },
            data: {
                ...(name && { name }),
                ...(type && { type }),
                ...(ansCode !== undefined && { ansCode }),
                ...(paymentDays !== undefined && { paymentDays }),
                ...(requiresAuth !== undefined && { requiresAuth }),
                ...(sessionsLimit !== undefined && { sessionsLimit }),
                ...(notes !== undefined && { notes }),
                ...(isActive !== undefined && { isActive }),
            },
        });
        res.json({ data: plan });
    }
    catch (error) {
        logger_1.default.error('Error updating health plan', { error });
        res.status(500).json({ error: 'Failed to update health plan' });
    }
});
// DELETE /api/appointments/health-plans/:id — soft delete se não tiver appointments ativos
router.delete('/health-plans/:id', async (req, res) => {
    if (!isAdmin(req))
        return res.status(403).json({ error: 'Admin required' });
    const accountId = getAccount(req);
    const id = parseInt(req.params.id);
    try {
        const existing = await database_1.default.healthPlan.findFirst({ where: { id, accountId } });
        if (!existing)
            return res.status(404).json({ error: 'Health plan not found' });
        const activeCount = await database_1.default.appointment.count({
            where: { accountId, healthPlanId: id, status: { notIn: ['cancelled', 'missed', 'completed'] } },
        });
        if (activeCount > 0) {
            return res.status(409).json({ error: 'Cannot delete: health plan has active appointments' });
        }
        await database_1.default.healthPlan.update({ where: { id }, data: { isActive: false } });
        res.json({ success: true });
    }
    catch (error) {
        logger_1.default.error('Error deleting health plan', { error });
        res.status(500).json({ error: 'Failed to delete health plan' });
    }
});
// ============================================================
// APPOINTMENTS (CRUD PRINCIPAL)
// ============================================================
// GET /api/appointments — lista com filtros
router.get('/', async (req, res) => {
    const accountId = getAccount(req);
    const { date, practitionerId, status, patientId, page = '1', limit = '50' } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const where = { accountId };
    if (practitionerId)
        where.practitionerId = parseInt(practitionerId);
    if (status)
        where.status = status;
    if (patientId)
        where.patientId = parseInt(patientId);
    if (date) {
        const d = new Date(date + 'T00:00:00');
        const dEnd = new Date(date + 'T23:59:59');
        where.appointmentAt = { gte: d, lte: dEnd };
    }
    try {
        const [appointments, total] = await Promise.all([
            database_1.default.appointment.findMany({
                where,
                orderBy: { appointmentAt: 'asc' },
                skip,
                take: parseInt(limit),
                include: {
                    patient: true,
                    practitioner: true,
                    service: true,
                    healthPlan: true,
                    reminders: { orderBy: { scheduledAt: 'asc' } },
                },
            }),
            database_1.default.appointment.count({ where }),
        ]);
        res.json({ data: appointments, total, page: parseInt(page) });
    }
    catch (error) {
        logger_1.default.error('Error fetching appointments', { error });
        res.status(500).json({ error: 'Failed to fetch appointments' });
    }
});
// GET /api/appointments/calendar — formato otimizado para calendário (semana/mês)
router.get('/calendar', async (req, res) => {
    const accountId = getAccount(req);
    const { startDate, endDate, practitionerId, serviceId } = req.query;
    if (!startDate || !endDate)
        return res.status(400).json({ error: 'startDate and endDate required' });
    const where = {
        accountId,
        appointmentAt: { gte: new Date(startDate), lte: new Date(endDate) },
        status: { notIn: ['cancelled'] },
    };
    if (practitionerId)
        where.practitionerId = parseInt(practitionerId);
    if (serviceId)
        where.serviceId = parseInt(serviceId);
    try {
        const appointments = await database_1.default.appointment.findMany({
            where,
            orderBy: { appointmentAt: 'asc' },
            include: { patient: true, practitioner: true, service: true },
        });
        res.json({ data: appointments });
    }
    catch (error) {
        logger_1.default.error('Error fetching calendar', { error });
        res.status(500).json({ error: 'Failed to fetch calendar' });
    }
});
// GET /api/appointments/:id
router.get('/:id', async (req, res) => {
    const accountId = getAccount(req);
    const id = parseInt(req.params.id);
    try {
        const appointment = await database_1.default.appointment.findFirst({
            where: { id, accountId },
            include: {
                patient: {
                    include: {
                        appointments: {
                            where: { id: { not: id } },
                            orderBy: { appointmentAt: 'desc' },
                            take: 5,
                            include: { service: true, practitioner: true },
                        },
                    },
                },
                practitioner: true,
                service: true,
                healthPlan: true,
                reminders: { orderBy: { scheduledAt: 'asc' } },
            },
        });
        if (!appointment)
            return res.status(404).json({ error: 'Appointment not found' });
        res.json({ data: appointment });
    }
    catch (error) {
        logger_1.default.error('Error fetching appointment', { error });
        res.status(500).json({ error: 'Failed to fetch appointment' });
    }
});
// POST /api/appointments — criar agendamento
router.post('/', async (req, res) => {
    const accountId = getAccount(req);
    const userId = getUser(req);
    const { patientId, practitionerId, serviceId, healthPlanId, appointmentAt, notes, price, chatwootConversationId, location, } = req.body;
    if (!patientId || !practitionerId || !serviceId || !appointmentAt) {
        return res.status(400).json({ error: 'patientId, practitionerId, serviceId, appointmentAt required' });
    }
    try {
        const service = await database_1.default.appointmentService.findFirst({ where: { id: parseInt(serviceId), accountId } });
        if (!service)
            return res.status(404).json({ error: 'Service not found' });
        const start = new Date(appointmentAt);
        const end = new Date(start.getTime() + service.durationMinutes * 60000);
        // Verificar conflito
        const conflict = await database_1.default.appointment.findFirst({
            where: {
                accountId,
                practitionerId: parseInt(practitionerId),
                status: { notIn: ['cancelled', 'missed'] },
                appointmentAt: { lt: end },
                endsAt: { gt: start },
            },
        });
        if (conflict) {
            return res.status(409).json({ error: 'Horário já ocupado com outro atendimento' });
        }
        const appointment = await database_1.default.appointment.create({
            data: {
                accountId,
                patientId: parseInt(patientId),
                practitionerId: parseInt(practitionerId),
                serviceId: parseInt(serviceId),
                healthPlanId: healthPlanId ? parseInt(healthPlanId) : null,
                appointmentAt: start,
                endsAt: end,
                notes: notes || null,
                price: price ?? null,
                chatwootConversationId: chatwootConversationId ? parseInt(chatwootConversationId) : null,
                location: location || null,
                createdBy: userId,
            },
            include: { patient: true, practitioner: true, service: true, healthPlan: true },
        });
        // Criar lembretes automáticos
        await scheduleReminders(appointment, accountId);
        res.status(201).json({ data: appointment });
    }
    catch (error) {
        logger_1.default.error('Error creating appointment', { error });
        res.status(500).json({ error: 'Failed to create appointment' });
    }
});
// PUT /api/appointments/:id — editar
router.put('/:id', async (req, res) => {
    const accountId = getAccount(req);
    const id = parseInt(req.params.id);
    const { patientId, practitionerId, serviceId, healthPlanId, appointmentAt, notes, price, chatwootConversationId, location } = req.body;
    try {
        const existing = await database_1.default.appointment.findFirst({ where: { id, accountId } });
        if (!existing)
            return res.status(404).json({ error: 'Appointment not found' });
        let endsAt = existing.endsAt;
        if (appointmentAt || serviceId) {
            const svcId = serviceId ? parseInt(serviceId) : existing.serviceId;
            const service = await database_1.default.appointmentService.findFirst({ where: { id: svcId, accountId } });
            const start = appointmentAt ? new Date(appointmentAt) : existing.appointmentAt;
            endsAt = new Date(start.getTime() + (service?.durationMinutes ?? 60) * 60000);
        }
        const appointment = await database_1.default.appointment.update({
            where: { id },
            data: {
                ...(patientId && { patientId: parseInt(patientId) }),
                ...(practitionerId && { practitionerId: parseInt(practitionerId) }),
                ...(serviceId && { serviceId: parseInt(serviceId) }),
                ...(healthPlanId !== undefined && { healthPlanId: healthPlanId ? parseInt(healthPlanId) : null }),
                ...(appointmentAt && { appointmentAt: new Date(appointmentAt), endsAt }),
                ...(notes !== undefined && { notes }),
                ...(price !== undefined && { price }),
                ...(chatwootConversationId !== undefined && { chatwootConversationId: chatwootConversationId ? parseInt(chatwootConversationId) : null }),
                ...(location !== undefined && { location }),
            },
            include: { patient: true, practitioner: true, service: true, healthPlan: true },
        });
        res.json({ data: appointment });
    }
    catch (error) {
        logger_1.default.error('Error updating appointment', { error });
        res.status(500).json({ error: 'Failed to update appointment' });
    }
});
// PATCH /api/appointments/:id/status
router.patch('/:id/status', async (req, res) => {
    const accountId = getAccount(req);
    const id = parseInt(req.params.id);
    const { status, cancelReason } = req.body;
    const validStatuses = ['scheduled', 'confirmed', 'waiting', 'in_progress', 'completed', 'missed', 'cancelled'];
    if (!status || !validStatuses.includes(status)) {
        return res.status(400).json({ error: `status must be one of: ${validStatuses.join(', ')}` });
    }
    try {
        const existing = await database_1.default.appointment.findFirst({ where: { id, accountId } });
        if (!existing)
            return res.status(404).json({ error: 'Appointment not found' });
        const appointment = await database_1.default.appointment.update({
            where: { id },
            data: { status, ...(cancelReason && { cancelReason }) },
            include: { patient: true, practitioner: true, service: true },
        });
        res.json({ data: appointment });
    }
    catch (error) {
        logger_1.default.error('Error updating appointment status', { error });
        res.status(500).json({ error: 'Failed to update status' });
    }
});
// DELETE /api/appointments/:id
router.delete('/:id', async (req, res) => {
    const accountId = getAccount(req);
    const id = parseInt(req.params.id);
    const { reason } = req.body;
    try {
        const existing = await database_1.default.appointment.findFirst({ where: { id, accountId } });
        if (!existing)
            return res.status(404).json({ error: 'Appointment not found' });
        await database_1.default.appointment.update({
            where: { id },
            data: { status: 'cancelled', cancelReason: reason || null },
        });
        // Cancelar lembretes pendentes
        await database_1.default.appointmentReminder.updateMany({
            where: { appointmentId: id, status: 'pending' },
            data: { status: 'cancelled' },
        });
        res.json({ success: true });
    }
    catch (error) {
        logger_1.default.error('Error cancelling appointment', { error });
        res.status(500).json({ error: 'Failed to cancel appointment' });
    }
});
// ============================================================
// WAITING LIST
// ============================================================
router.get('/waiting-list', async (req, res) => {
    const accountId = getAccount(req);
    try {
        const list = await database_1.default.waitingList.findMany({
            where: { accountId, isActive: true },
            orderBy: [{ priority: 'asc' }, { createdAt: 'asc' }],
        });
        res.json({ data: list });
    }
    catch (error) {
        logger_1.default.error('Error fetching waiting list', { error });
        res.status(500).json({ error: 'Failed to fetch waiting list' });
    }
});
router.post('/waiting-list', async (req, res) => {
    const accountId = getAccount(req);
    const { patientId, practitionerId, serviceId, preferredDays, preferredPeriod, priority, notes } = req.body;
    if (!patientId)
        return res.status(400).json({ error: 'patientId required' });
    try {
        const entry = await database_1.default.waitingList.create({
            data: {
                accountId,
                patientId: parseInt(patientId),
                practitionerId: practitionerId ? parseInt(practitionerId) : null,
                serviceId: serviceId ? parseInt(serviceId) : null,
                preferredDays: preferredDays ? JSON.stringify(preferredDays) : null,
                preferredPeriod: preferredPeriod || null,
                priority: priority || 'normal',
                notes: notes || null,
            },
        });
        res.status(201).json({ data: entry });
    }
    catch (error) {
        logger_1.default.error('Error adding to waiting list', { error });
        res.status(500).json({ error: 'Failed to add to waiting list' });
    }
});
// PUT /api/appointments/waiting-list/:id
router.put('/waiting-list/:id', async (req, res) => {
    const accountId = getAccount(req);
    const id = parseInt(req.params.id);
    const { preferredDays, preferredPeriod, priority, notes, isActive } = req.body;
    try {
        const existing = await database_1.default.waitingList.findFirst({ where: { id, accountId } });
        if (!existing)
            return res.status(404).json({ error: 'Entry not found' });
        const entry = await database_1.default.waitingList.update({
            where: { id },
            data: {
                ...(preferredDays !== undefined && { preferredDays: preferredDays ? JSON.stringify(preferredDays) : null }),
                ...(preferredPeriod !== undefined && { preferredPeriod: preferredPeriod || null }),
                ...(priority !== undefined && { priority }),
                ...(notes !== undefined && { notes: notes || null }),
                ...(isActive !== undefined && { isActive }),
            },
        });
        res.json({ data: entry });
    }
    catch (error) {
        logger_1.default.error('Error updating waiting list entry', { error });
        res.status(500).json({ error: 'Failed to update waiting list entry' });
    }
});
router.delete('/waiting-list/:id', async (req, res) => {
    const accountId = getAccount(req);
    const id = parseInt(req.params.id);
    try {
        const existing = await database_1.default.waitingList.findFirst({ where: { id, accountId } });
        if (!existing)
            return res.status(404).json({ error: 'Entry not found' });
        await database_1.default.waitingList.update({ where: { id }, data: { isActive: false } });
        res.json({ success: true });
    }
    catch (error) {
        logger_1.default.error('Error removing from waiting list', { error });
        res.status(500).json({ error: 'Failed to remove from waiting list' });
    }
});
// ============================================================
// REMINDER CONFIG
// ============================================================
router.get('/config/reminders', async (req, res) => {
    const accountId = getAccount(req);
    try {
        const config = await database_1.default.reminderConfig.findUnique({ where: { accountId } });
        res.json({ data: config || getDefaultReminderConfig() });
    }
    catch (error) {
        logger_1.default.error('Error fetching reminder config', { error });
        res.status(500).json({ error: 'Failed to fetch reminder config' });
    }
});
router.put('/config/reminders', async (req, res) => {
    if (!isAdmin(req))
        return res.status(403).json({ error: 'Admin required' });
    const accountId = getAccount(req);
    const data = req.body;
    try {
        const config = await database_1.default.reminderConfig.upsert({
            where: { accountId },
            create: { accountId, ...data },
            update: data,
        });
        res.json({ data: config });
    }
    catch (error) {
        logger_1.default.error('Error saving reminder config', { error });
        res.status(500).json({ error: 'Failed to save reminder config' });
    }
});
// ============================================================
// APPOINTMENT CONFIG (timezone, slug, etc.)
// ============================================================
router.get('/config', async (req, res) => {
    const accountId = getAccount(req);
    try {
        const config = await database_1.default.appointmentConfig.findUnique({ where: { accountId } });
        res.json({ data: config });
    }
    catch (error) {
        logger_1.default.error('Error fetching appointment config', { error });
        res.status(500).json({ error: 'Failed to fetch config' });
    }
});
router.put('/config', async (req, res) => {
    if (!isAdmin(req))
        return res.status(403).json({ error: 'Admin required' });
    const accountId = getAccount(req);
    const { slug, clinicName, timezone, onlineBookingEnabled, minAdvanceHours, maxAdvanceDays, requireManualApproval, reminderInboxId } = req.body;
    try {
        const config = await database_1.default.appointmentConfig.upsert({
            where: { accountId },
            create: { accountId, slug, clinicName, timezone, onlineBookingEnabled, minAdvanceHours, maxAdvanceDays, requireManualApproval, reminderInboxId },
            update: {
                ...(slug !== undefined && { slug }),
                ...(clinicName !== undefined && { clinicName }),
                ...(timezone && { timezone }),
                ...(onlineBookingEnabled !== undefined && { onlineBookingEnabled }),
                ...(minAdvanceHours !== undefined && { minAdvanceHours }),
                ...(maxAdvanceDays !== undefined && { maxAdvanceDays }),
                ...(requireManualApproval !== undefined && { requireManualApproval }),
                ...(reminderInboxId !== undefined && { reminderInboxId: reminderInboxId ? parseInt(reminderInboxId) : null }),
            },
        });
        res.json({ data: config });
    }
    catch (error) {
        logger_1.default.error('Error saving appointment config', { error });
        res.status(500).json({ error: 'Failed to save config' });
    }
});
// ============================================================
// REPORTS
// ============================================================
router.get('/reports/overview', async (req, res) => {
    const accountId = getAccount(req);
    const { startDate, endDate } = req.query;
    const start = startDate ? new Date(startDate) : new Date(Date.now() - 7 * 24 * 3600000);
    const end = endDate ? new Date(endDate + 'T23:59:59') : new Date();
    try {
        const [total, completed, missed, cancelled] = await Promise.all([
            database_1.default.appointment.count({ where: { accountId, appointmentAt: { gte: start, lte: end } } }),
            database_1.default.appointment.count({ where: { accountId, appointmentAt: { gte: start, lte: end }, status: 'completed' } }),
            database_1.default.appointment.count({ where: { accountId, appointmentAt: { gte: start, lte: end }, status: 'missed' } }),
            database_1.default.appointment.count({ where: { accountId, appointmentAt: { gte: start, lte: end }, status: 'cancelled' } }),
        ]);
        const attendanceRate = total > 0 ? Math.round((completed / total) * 100) : 0;
        res.json({ data: { total, completed, missed, cancelled, attendanceRate, period: { start, end } } });
    }
    catch (error) {
        logger_1.default.error('Error fetching overview report', { error });
        res.status(500).json({ error: 'Failed to fetch report' });
    }
});
router.get('/reports/by-practitioner', async (req, res) => {
    const accountId = getAccount(req);
    const { startDate, endDate } = req.query;
    const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 3600000);
    const end = endDate ? new Date(endDate + 'T23:59:59') : new Date();
    try {
        const practitioners = await database_1.default.practitioner.findMany({ where: { accountId }, orderBy: { name: 'asc' } });
        const report = await Promise.all(practitioners.map(async (p) => {
            const [total, completed, missed] = await Promise.all([
                database_1.default.appointment.count({ where: { accountId, practitionerId: p.id, appointmentAt: { gte: start, lte: end } } }),
                database_1.default.appointment.count({ where: { accountId, practitionerId: p.id, appointmentAt: { gte: start, lte: end }, status: 'completed' } }),
                database_1.default.appointment.count({ where: { accountId, practitionerId: p.id, appointmentAt: { gte: start, lte: end }, status: 'missed' } }),
            ]);
            return { practitioner: p, total, completed, missed, attendanceRate: total > 0 ? Math.round((completed / total) * 100) : 0 };
        }));
        res.json({ data: report });
    }
    catch (error) {
        logger_1.default.error('Error fetching practitioner report', { error });
        res.status(500).json({ error: 'Failed to fetch report' });
    }
});
router.get('/reports/missed', async (req, res) => {
    const accountId = getAccount(req);
    const { startDate, endDate } = req.query;
    const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 3600000);
    const end = endDate ? new Date(endDate + 'T23:59:59') : new Date();
    try {
        const missed = await database_1.default.appointment.findMany({
            where: { accountId, status: 'missed', appointmentAt: { gte: start, lte: end } },
            include: { patient: true, practitioner: true, service: true },
            orderBy: { appointmentAt: 'desc' },
        });
        res.json({ data: missed });
    }
    catch (error) {
        logger_1.default.error('Error fetching missed report', { error });
        res.status(500).json({ error: 'Failed to fetch report' });
    }
});
// ============================================================
// HELPERS
// ============================================================
function getDefaultReminderConfig() {
    return {
        confirmationEnabled: false,
        confirmationMessage: 'Olá {{nome}}! Seu agendamento foi confirmado para {{data}} às {{hora}} com {{profissional}}. Local: {{local}}.',
        reminder24hEnabled: false,
        reminder24hTime: '09:00',
        reminder24hMessage: 'Olá {{nome}}! Lembramos que você tem consulta amanhã, {{data}} às {{hora}} com {{profissional}}. Responda CONFIRMAR ou CANCELAR.',
        reminder2hEnabled: false,
        reminder2hMessage: '{{nome}}, em breve é a sua vez! Estamos te esperando às {{hora}}.',
        postAppointmentEnabled: false,
        postAppointmentMessage: 'Obrigado pela sua visita! Como foi o atendimento?',
        postAppointmentDelayHours: 2,
    };
}
async function scheduleReminders(appointment, accountId) {
    try {
        const config = await database_1.default.reminderConfig.findUnique({ where: { accountId } }) || getDefaultReminderConfig();
        const reminders = [];
        const apptTime = new Date(appointment.appointmentAt);
        const apptEnd = appointment.endsAt ? new Date(appointment.endsAt) : new Date(apptTime.getTime() + 60 * 60000);
        const now = new Date();
        // Verifica antecipadamente se o serviço tem lembretes próprios
        // Se tiver, os lembretes globais (confirmação, 24h, 2h) são ignorados
        const serviceRemindersCount = appointment.serviceId
            ? await database_1.default.serviceReminder.count({ where: { serviceId: appointment.serviceId, accountId, isActive: true } })
            : 0;
        const useGlobalReminders = serviceRemindersCount === 0;
        // Confirmação imediata (somente se não houver lembretes de serviço)
        if (useGlobalReminders && config.confirmationEnabled) {
            reminders.push({
                appointmentId: appointment.id,
                accountId,
                type: 'confirmation',
                message: config.confirmationMessage || '',
                scheduledAt: now,
                status: 'pending',
            });
        }
        // 24h antes (somente se não houver lembretes de serviço)
        if (useGlobalReminders && config.reminder24hEnabled) {
            const t = config.reminder24hTime || '09:00';
            const [h, m] = t.split(':').map(Number);
            const send24h = new Date(apptTime);
            send24h.setDate(send24h.getDate() - 1);
            send24h.setHours(h, m, 0, 0);
            if (send24h > now) {
                reminders.push({
                    appointmentId: appointment.id,
                    accountId,
                    type: '24h',
                    message: config.reminder24hMessage || '',
                    scheduledAt: send24h,
                    status: 'pending',
                });
            }
        }
        // 2h antes (somente se não houver lembretes de serviço)
        if (useGlobalReminders && config.reminder2hEnabled) {
            const send2h = new Date(apptTime.getTime() - 2 * 3600000);
            if (send2h > now) {
                reminders.push({
                    appointmentId: appointment.id,
                    accountId,
                    type: '2h',
                    message: config.reminder2hMessage || '',
                    scheduledAt: send2h,
                    status: 'pending',
                });
            }
        }
        // Pós-consulta (global)
        if (config.postAppointmentEnabled) {
            const delayH = config.postAppointmentDelayHours ?? 2;
            const sendPost = new Date(apptEnd.getTime() + delayH * 3600000);
            reminders.push({
                appointmentId: appointment.id,
                accountId,
                type: 'post',
                message: config.postAppointmentMessage || '',
                scheduledAt: sendPost,
                status: 'pending',
            });
        }
        if (reminders.length > 0) {
            await database_1.default.appointmentReminder.createMany({ data: reminders });
        }
        // Service reminders (lembretes por serviço — antes e depois)
        if (appointment.serviceId) {
            const serviceReminders = await database_1.default.serviceReminder.findMany({
                where: { serviceId: appointment.serviceId, accountId, isActive: true },
                orderBy: { order: 'asc' },
            });
            const serviceReminderRows = [];
            for (const sr of serviceReminders) {
                const totalMs = (sr.daysBefore * 24 * 3600 + sr.hoursBefore * 3600 + (sr.minutesBefore ?? 0) * 60) * 1000;
                let scheduledAt;
                if (sr.timing === 'after') {
                    scheduledAt = new Date(apptEnd.getTime() + totalMs);
                }
                else {
                    scheduledAt = new Date(apptTime.getTime() - totalMs);
                    if (scheduledAt <= now)
                        continue; // já passou
                }
                serviceReminderRows.push({
                    appointmentId: appointment.id,
                    accountId,
                    type: 'service',
                    serviceReminderId: sr.id,
                    inboxId: sr.inboxId ?? null,
                    message: sr.message,
                    waTemplateName: sr.waTemplateName ?? null,
                    waTemplateLang: sr.waTemplateLang ?? null,
                    waTemplateParams: sr.waTemplateParams ?? null,
                    scheduledAt,
                    status: 'pending',
                });
            }
            if (serviceReminderRows.length > 0) {
                await database_1.default.appointmentReminder.createMany({ data: serviceReminderRows });
            }
        }
    }
    catch (err) {
        logger_1.default.warn('Failed to schedule reminders (non-critical)', { error: err });
    }
}
exports.default = router;
//# sourceMappingURL=appointments.js.map
