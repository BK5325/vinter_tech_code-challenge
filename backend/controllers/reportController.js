const { stringify } = require('csv-stringify');
const ExcelJS = require('exceljs');
const Attempt = require('../models/Attempt');
const User = require('../models/User');
const SecurityEvent = require('../models/SecurityEvent');
const AuditLog = require('../models/AuditLog');

// ─── Challenge Results Report ─────────────────────────────────────────────────
const getResultsReport = async (req, res, next) => {
  try {
    const { challengeId } = req.query;
    const filter = { status: { $in: ['SUBMITTED', 'AUTO_SUBMITTED'] } };
    if (challengeId) filter.challengeId = challengeId;

    const attempts = await Attempt.find(filter)
      .populate('userId', 'name email institution course studentId phone')
      .populate('challengeId', 'title totalMarks duration')
      .sort({ score: -1, timeTaken: 1 });

    return res.status(200).json({
      success: true,
      data: {
        report: attempts.map((a, idx) => ({
          rank: idx + 1,
          name: a.userId?.name,
          email: a.userId?.email,
          studentId: a.userId?.studentId,
          institution: a.userId?.institution,
          course: a.userId?.course,
          challenge: a.challengeId?.title,
          score: a.score,
          totalMarks: a.totalMarks,
          percentage: a.percentage,
          correct: a.correctCount,
          wrong: a.wrongCount,
          unanswered: a.unansweredCount,
          timeTaken: a.timeTaken,
          status: a.status,
          submissionReason: a.submissionReason,
          submittedAt: a.submittedAt,
          violations: a.violationCount,
        })),
      },
    });
  } catch (error) { next(error); }
};

// ─── Export CSV ───────────────────────────────────────────────────────────────
const exportCSV = async (req, res, next) => {
  try {
    const { challengeId, type = 'results' } = req.query;
    const filter = { status: { $in: ['SUBMITTED', 'AUTO_SUBMITTED'] } };
    if (challengeId) filter.challengeId = challengeId;

    const attempts = await Attempt.find(filter)
      .populate('userId', 'name email institution course studentId phone')
      .populate('challengeId', 'title totalMarks')
      .sort({ score: -1, timeTaken: 1 });

    const rows = [
      ['Rank', 'Name', 'Email', 'Student ID', 'Institution', 'Course', 'Challenge', 'Score', 'Total Marks', 'Percentage', 'Correct', 'Wrong', 'Unanswered', 'Time Taken (s)', 'Status', 'Submission Reason', 'Submitted At', 'Violations'],
    ];

    attempts.forEach((a, idx) => {
      rows.push([
        idx + 1,
        a.userId?.name || '',
        a.userId?.email || '',
        a.userId?.studentId || '',
        a.userId?.institution || '',
        a.userId?.course || '',
        a.challengeId?.title || '',
        a.score,
        a.totalMarks,
        a.percentage,
        a.correctCount,
        a.wrongCount,
        a.unansweredCount,
        a.timeTaken,
        a.status,
        a.submissionReason || '',
        a.submittedAt ? new Date(a.submittedAt).toISOString() : '',
        a.violationCount,
      ]);
    });

    await AuditLog.create({
      userId: req.user._id, userEmail: req.user.email,
      action: 'EXPORT_DATA', description: 'CSV export: results', ipAddress: req.ip,
    });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="results_${Date.now()}.csv"`);

    stringify(rows, (err, output) => {
      if (err) return next(err);
      res.send(output);
    });
  } catch (error) { next(error); }
};

// ─── Export XLSX ──────────────────────────────────────────────────────────────
const exportXLSX = async (req, res, next) => {
  try {
    const { challengeId } = req.query;
    const filter = { status: { $in: ['SUBMITTED', 'AUTO_SUBMITTED'] } };
    if (challengeId) filter.challengeId = challengeId;

    const attempts = await Attempt.find(filter)
      .populate('userId', 'name email institution course studentId phone')
      .populate('challengeId', 'title totalMarks')
      .sort({ score: -1, timeTaken: 1 });

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Code Challenge Platform';
    workbook.created = new Date();

    const sheet = workbook.addWorksheet('Results');

    sheet.columns = [
      { header: 'Rank', key: 'rank', width: 8 },
      { header: 'Name', key: 'name', width: 25 },
      { header: 'Email', key: 'email', width: 30 },
      { header: 'Student ID', key: 'studentId', width: 15 },
      { header: 'Institution', key: 'institution', width: 25 },
      { header: 'Course', key: 'course', width: 20 },
      { header: 'Challenge', key: 'challenge', width: 30 },
      { header: 'Score', key: 'score', width: 10 },
      { header: 'Total Marks', key: 'totalMarks', width: 12 },
      { header: 'Percentage', key: 'percentage', width: 12 },
      { header: 'Correct', key: 'correct', width: 10 },
      { header: 'Wrong', key: 'wrong', width: 10 },
      { header: 'Unanswered', key: 'unanswered', width: 12 },
      { header: 'Time Taken (s)', key: 'timeTaken', width: 15 },
      { header: 'Status', key: 'status', width: 15 },
      { header: 'Submission Reason', key: 'submissionReason', width: 20 },
      { header: 'Submitted At', key: 'submittedAt', width: 22 },
      { header: 'Violations', key: 'violations', width: 12 },
    ];

    // Style header row
    sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4F46E5' } };

    attempts.forEach((a, idx) => {
      sheet.addRow({
        rank: idx + 1,
        name: a.userId?.name || '',
        email: a.userId?.email || '',
        studentId: a.userId?.studentId || '',
        institution: a.userId?.institution || '',
        course: a.userId?.course || '',
        challenge: a.challengeId?.title || '',
        score: a.score,
        totalMarks: a.totalMarks,
        percentage: a.percentage,
        correct: a.correctCount,
        wrong: a.wrongCount,
        unanswered: a.unansweredCount,
        timeTaken: a.timeTaken,
        status: a.status,
        submissionReason: a.submissionReason || '',
        submittedAt: a.submittedAt ? new Date(a.submittedAt).toLocaleString() : '',
        violations: a.violationCount,
      });
    });

    await AuditLog.create({
      userId: req.user._id, userEmail: req.user.email,
      action: 'EXPORT_DATA', description: 'XLSX export: results', ipAddress: req.ip,
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="results_${Date.now()}.xlsx"`);

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) { next(error); }
};

// ─── Security Events Report ───────────────────────────────────────────────────
const getSecurityReport = async (req, res, next) => {
  try {
    const { challengeId } = req.query;
    const filter = {};
    if (challengeId) filter.challengeId = challengeId;

    const events = await SecurityEvent.find(filter)
      .populate('userId', 'name email')
      .populate('challengeId', 'title')
      .sort({ createdAt: -1 })
      .limit(500);

    return res.status(200).json({ success: true, data: { events } });
  } catch (error) { next(error); }
};

// ─── Participant Performance ──────────────────────────────────────────────────
const getParticipantReport = async (req, res, next) => {
  try {
    const participants = await User.find({ role: 'PARTICIPANT' }).select('name email institution course studentId');
    const stats = await Promise.all(
      participants.map(async (p) => {
        const attempts = await Attempt.find({
          userId: p._id,
          status: { $in: ['SUBMITTED', 'AUTO_SUBMITTED'] },
        });
        const avgScore = attempts.length > 0
          ? Math.round(attempts.reduce((s, a) => s + a.percentage, 0) / attempts.length * 100) / 100
          : 0;
        return {
          participant: { name: p.name, email: p.email, institution: p.institution, course: p.course, studentId: p.studentId },
          totalAttempts: attempts.length,
          averagePercentage: avgScore,
          highestPercentage: attempts.length > 0 ? Math.max(...attempts.map((a) => a.percentage)) : 0,
        };
      })
    );

    return res.status(200).json({ success: true, data: { report: stats } });
  } catch (error) { next(error); }
};

module.exports = { getResultsReport, exportCSV, exportXLSX, getSecurityReport, getParticipantReport };
