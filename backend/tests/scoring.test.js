const { evaluateAnswer, calculateMarks } = require('../services/scoringService');

describe('Scoring Service Tests (Feature 3 & Regression)', () => {
  test('Evaluates MCQ single answer correctly', () => {
    const question = {
      questionType: 'MCQ',
      correctAnswer: 'opt_123',
      multipleCorrect: false,
      marks: 2,
      negativeMarks: 0.5,
    };

    expect(evaluateAnswer(question, 'opt_123')).toEqual({ isCorrect: true, status: 'CORRECT' });
    expect(calculateMarks(question, { isCorrect: true, status: 'CORRECT' }, true)).toBe(2);

    expect(evaluateAnswer(question, 'opt_wrong')).toEqual({ isCorrect: false, status: 'WRONG' });
    expect(calculateMarks(question, { isCorrect: false, status: 'WRONG' }, true)).toBe(-0.5);

    expect(evaluateAnswer(question, null)).toEqual({ isCorrect: null, status: 'UNANSWERED' });
    expect(calculateMarks(question, { isCorrect: null, status: 'UNANSWERED' }, true)).toBe(0);
  });

  test('Evaluates MCQ multiple correct answers (Multiple Select)', () => {
    const question = {
      questionType: 'MCQ',
      correctAnswer: ['opt_a', 'opt_c'],
      multipleCorrect: true,
      marks: 3,
      negativeMarks: 1,
    };

    expect(evaluateAnswer(question, ['opt_c', 'opt_a'])).toEqual({ isCorrect: true, status: 'CORRECT' });
    expect(evaluateAnswer(question, ['opt_a'])).toEqual({ isCorrect: false, status: 'WRONG' });
  });

  test('Evaluates Short Answer with trimming and case insensitivity', () => {
    const question = {
      questionType: 'SHORT_ANSWER',
      correctAnswer: 'Python',
      evaluationMode: 'CASE_INSENSITIVE',
      marks: 1,
      negativeMarks: 0,
    };

    expect(evaluateAnswer(question, 'python')).toEqual({ isCorrect: true, status: 'CORRECT' });
    expect(evaluateAnswer({ ...question, evaluationMode: 'TRIMMED' }, '  Python  ')).toEqual({ isCorrect: true, status: 'CORRECT' });
    expect(evaluateAnswer(question, 'Java')).toEqual({ isCorrect: false, status: 'WRONG' });
  });

  test('Evaluates Long Answer as PENDING_EVALUATION when response is provided', () => {
    const question = {
      questionType: 'LONG_ANSWER',
      correctAnswer: 'A list is mutable while a tuple is immutable.',
      marks: 5,
      negativeMarks: 0,
    };

    const studentAnswer = 'Lists are mutable and can be modified. Tuples are immutable and fixed.';
    const result = evaluateAnswer(question, studentAnswer);

    // Must NOT compare with simple string equality
    expect(result.status).toBe('PENDING_EVALUATION');
    expect(result.isCorrect).toBeNull();

    // Pending marks must be 0 until evaluated
    const marks = calculateMarks(question, result, false);
    expect(marks).toBe(0);
  });

  test('Evaluates Long Answer as UNANSWERED when empty', () => {
    const question = {
      questionType: 'LONG_ANSWER',
      correctAnswer: 'Expected response',
      marks: 5,
      negativeMarks: 0,
    };

    expect(evaluateAnswer(question, '')).toEqual({ isCorrect: null, status: 'UNANSWERED' });
    expect(evaluateAnswer(question, '   ')).toEqual({ isCorrect: null, status: 'UNANSWERED' });
    expect(evaluateAnswer(question, null)).toEqual({ isCorrect: null, status: 'UNANSWERED' });
  });
});
