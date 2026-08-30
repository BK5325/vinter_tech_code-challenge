const Answer = require('../models/Answer');
const Question = require('../models/Question');

/**
 * Evaluate a single answer against the question's correct answer
 */
const evaluateAnswer = (question, answerData) => {
  if (answerData === null || answerData === undefined || answerData === '') {
    return { isCorrect: null, status: 'UNANSWERED' };
  }

  const { questionType, correctAnswer, evaluationMode, multipleCorrect } = question;

  if (questionType === 'OMR') {
    const isCorrect = String(answerData) === String(correctAnswer);
    return { isCorrect, status: isCorrect ? 'CORRECT' : 'WRONG' };
  }

  if (questionType === 'MCQ') {
    if (multipleCorrect) {
      const given = Array.isArray(answerData) ? answerData.map(String).sort() : [String(answerData)];
      const expected = Array.isArray(correctAnswer) ? correctAnswer.map(String).sort() : [String(correctAnswer)];
      const isCorrect = JSON.stringify(given) === JSON.stringify(expected);
      return { isCorrect, status: isCorrect ? 'CORRECT' : 'WRONG' };
    } else {
      const isCorrect = String(answerData) === String(correctAnswer);
      return { isCorrect, status: isCorrect ? 'CORRECT' : 'WRONG' };
    }
  }

  if (questionType === 'SHORT_ANSWER') {
    const given = String(answerData);
    const expected = String(correctAnswer);

    let isCorrect = false;
    switch (evaluationMode) {
      case 'EXACT':
        isCorrect = given === expected;
        break;
      case 'CASE_INSENSITIVE':
        isCorrect = given.toLowerCase() === expected.toLowerCase();
        break;
      case 'TRIMMED':
        isCorrect = given.trim().toLowerCase() === expected.trim().toLowerCase();
        break;
      default:
        isCorrect = given.toLowerCase() === expected.toLowerCase();
    }
    return { isCorrect, status: isCorrect ? 'CORRECT' : 'WRONG' };
  }

  return { isCorrect: null, status: 'UNANSWERED' };
};

/**
 * Calculate marks for a question result
 */
const calculateMarks = (question, evaluationResult, negativeMarkingEnabled) => {
  const { isCorrect, status } = evaluationResult;

  if (status === 'UNANSWERED') return 0;
  if (isCorrect) return question.marks;
  if (negativeMarkingEnabled && question.negativeMarks > 0) {
    return -question.negativeMarks;
  }
  return 0;
};

/**
 * Full attempt scoring — runs after submission
 * Returns { score, totalMarks, correctCount, wrongCount, unansweredCount, percentage }
 */
const scoreAttempt = async (attempt, challenge) => {
  const answers = await Answer.find({ attemptId: attempt._id });
  const questions = await Question.find({ _id: { $in: attempt.questionOrder } });

  const questionMap = {};
  questions.forEach((q) => { questionMap[q._id.toString()] = q; });

  const answerMap = {};
  answers.forEach((a) => { answerMap[a.questionId.toString()] = a; });

  let score = 0;
  let totalMarks = 0;
  let correctCount = 0;
  let wrongCount = 0;
  let unansweredCount = 0;

  const answerUpdates = [];

  for (const qId of attempt.questionOrder) {
    const question = questionMap[qId.toString()];
    if (!question) continue;

    totalMarks += question.marks;

    const answer = answerMap[qId.toString()];
    const answerData = answer ? answer.answerData : null;

    const evalResult = evaluateAnswer(question, answerData);
    const marksAwarded = calculateMarks(question, evalResult, challenge.negativeMarking);

    score += marksAwarded;

    if (evalResult.status === 'CORRECT') correctCount++;
    else if (evalResult.status === 'WRONG') wrongCount++;
    else unansweredCount++;

    // Update answer doc
    if (answer) {
      answerUpdates.push(
        Answer.findByIdAndUpdate(answer._id, {
          isCorrect: evalResult.isCorrect,
          marksAwarded,
        })
      );
    } else {
      // Create unanswered answer record
      answerUpdates.push(
        Answer.create({
          attemptId: attempt._id,
          questionId: qId,
          answerData: null,
          isCorrect: null,
          marksAwarded: 0,
          answeredAt: null,
          markedForReview: false,
        }).catch(() => {}) // may already exist
      );
    }
  }

  await Promise.allSettled(answerUpdates);

  const percentage = totalMarks > 0 ? Math.round((score / totalMarks) * 100 * 100) / 100 : 0;

  return { score, totalMarks, correctCount, wrongCount, unansweredCount, percentage };
};

module.exports = { evaluateAnswer, calculateMarks, scoreAttempt };
