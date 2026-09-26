import { response } from '../utils/response.js'
import { getMonitoringSchedulesList, getMonitoringScheduleDetail, getMonitoringParticipantDetail, resetParticipantTime as resetParticipantTimeService, toggleParticipantPause as toggleParticipantPauseService } from '../services/monitoring.service.js'

export async function getMonitoringSchedules(req, res, next) {
  try {
    const items = await getMonitoringSchedulesList();
    return response.success(res, {
      data: {
        serverTime: new Date().toISOString(),
        items
      }
    });
  } catch (err) {
    next(err);
  }
}

export async function getMonitoringDetail(req, res, next) {
  try {
    const { scheduleId } = req.params;
    const data = await getMonitoringScheduleDetail(scheduleId);
    
    return response.success(res, {
      data: {
        serverTime: new Date().toISOString(),
        ...data
      }
    });
  } catch (err) {
    next(err);
  }
}

export async function getParticipantDetail(req, res, next) {
  try {
    const { scheduleId, participantId } = req.params;
    const data = await getMonitoringParticipantDetail(scheduleId, participantId);
    
    return response.success(res, {
      data
    });
  } catch (err) {
    next(err);
  }
}

export async function resetParticipantTime(req, res, next) {
  try {
    const { scheduleId, participantId } = req.params;
    const data = await resetParticipantTimeService(scheduleId, participantId);
    
    return response.success(res, {
      message: data.message,
      data
    });
  } catch (err) {
    next(err);
  }
}

export async function toggleParticipantPause(req, res, next) {
  try {
    const { scheduleId, participantId } = req.params;
    const data = await toggleParticipantPauseService(scheduleId, participantId);
    
    return response.success(res, {
      message: data.message,
      data
    });
  } catch (err) {
    next(err);
  }
}

