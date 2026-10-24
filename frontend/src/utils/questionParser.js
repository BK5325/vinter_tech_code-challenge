/**
 * Question Paper & Quiz Parser for Vinter Tech Code Challenge Platform (Frontend ESM)
 */

export const generateTempId = () => {
  return 'temp_' + Math.random().toString(36).substring(2, 9) + '_' + Date.now();
};

export const parseRawQuestions = (text, defaults = {}) => {
  const {
    defaultMarks = 1,
    defaultNegativeMarks = 0,
    defaultDifficulty = 'MEDIUM',
    defaultCategory = 'General',
    format = 'AUTO',
  } = defaults;

  if (!text || !text.trim()) {
    return { title: '', questions: [], totalMarks: 0, summary: { total: 0, valid: 0, missingAnswer: 0, review: 0 } };
  }

  const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');

  let title = '';
  const questionBlocks = [];
  let currentBlock = [];

  const questionNumberRegex = /^\s*(?:(?:Q(?:uestion)?\s*[\.\:\-]?\s*)?(\d+)[\.\)\:\-\]]|\((\d+)\)|\[(\d+)\])\s+(.*)$/i;
  const optionRegex = /^\s*(?:\(?([A-Za-z])[\.\)\:\-]\s+|\[([A-Za-z])\]\s*)(.+)$/;

  const answerRegex = /^\s*(?:Correct\s+Answers?|Correct\s+Options?|Answers?|Ans)\s*[\:\-]\s*(.+)$/i;
  const marksRegex = /^\s*(?:Maximum\s+Marks?|Max\s+Marks?|Marks?|Points?)\s*[\:\-]\s*(\d+(?:\.\d+)?)/i;
  const inlineMarksRegex = /[\[\(]\s*(\d+(?:\.\d+)?)\s*(?:marks?|pts?|points?)\s*[\]\)]/i;
  const negativeMarksRegex = /^\s*(?:Negative\s+Marks?|Negative)\s*[\:\-]\s*(\d+(?:\.\d+)?)/i;
  const difficultyRegex = /^\s*Difficulty\s*[\:\-]\s*(Easy|Medium|Hard)/i;
  const categoryRegex = /^\s*(?:Category|Topic)\s*[\:\-]\s*(.+)$/i;
  const explanationRegex = /^\s*(?:Explanation|Explain|Solution)\s*[\:\-]\s*(.*)$/i;

  let firstQuestionFound = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    if (!firstQuestionFound) {
      if (!trimmed) continue;
      const match = trimmed.match(questionNumberRegex);
      if (match) {
        firstQuestionFound = true;
        currentBlock.push(line);
      } else {
        if (!title && trimmed.length > 0 && !trimmed.startsWith('#')) {
          title = trimmed;
        }
      }
    } else {
      const match = trimmed.match(questionNumberRegex);
      if (match) {
        if (currentBlock.length > 0) {
          questionBlocks.push([...currentBlock]);
          currentBlock = [];
        }
        currentBlock.push(line);
      } else {
        currentBlock.push(line);
      }
    }
  }

  if (currentBlock.length > 0) {
    questionBlocks.push(currentBlock);
  }

  if (questionBlocks.length === 0 && lines.some((l) => l.trim())) {
    questionBlocks.push(lines);
  }

  const parsedQuestions = questionBlocks.map((blockLines, index) => {
    let questionTextLines = [];
    const rawOptions = [];
    let detectedAnswer = null;
    let detectedMultipleAnswers = false;
    let detectedMarks = null;
    let detectedNegativeMarks = null;
    let detectedDifficulty = null;
    let detectedCategory = null;
    let detectedExplanation = '';
    let isParsingExplanation = false;
    let inOptionsPhase = false;

    const firstLine = blockLines[0] || '';
    const firstMatch = firstLine.trim().match(questionNumberRegex);
    let startText = firstLine;
    if (firstMatch) {
      startText = firstMatch[4] || '';
    }

    const inlineMarkMatch = startText.match(inlineMarksRegex);
    if (inlineMarkMatch) {
      detectedMarks = parseFloat(inlineMarkMatch[1]);
      startText = startText.replace(inlineMarksRegex, '').trim();
    }

    if (startText.trim()) {
      questionTextLines.push(startText);
    }

    for (let i = 1; i < blockLines.length; i++) {
      const line = blockLines[i];
      const trimmed = line.trim();

      if (!trimmed) {
        if (isParsingExplanation) {
          detectedExplanation += '\n';
        } else if (!inOptionsPhase) {
          questionTextLines.push('');
        }
        continue;
      }

      const expMatch = trimmed.match(explanationRegex);
      if (expMatch) {
        isParsingExplanation = true;
        detectedExplanation = expMatch[1] || '';
        continue;
      }

      if (isParsingExplanation) {
        const ansM = trimmed.match(answerRegex);
        const marksM = trimmed.match(marksRegex);
        const negM = trimmed.match(negativeMarksRegex);
        if (!ansM && !marksM && !negM) {
          detectedExplanation += (detectedExplanation ? '\n' : '') + trimmed;
          continue;
        } else {
          isParsingExplanation = false;
        }
      }

      const ansMatch = trimmed.match(answerRegex);
      if (ansMatch) {
        const rawAns = ansMatch[1].trim();
        if (rawAns.includes(',') || rawAns.includes(';') || /\b(?:and|&)\b/i.test(rawAns)) {
          const splitAns = rawAns
            .split(/[,;&]|\band\b/i)
            .map((s) => s.trim().replace(/^[\(\[]|[\)\]]$/g, ''))
            .filter(Boolean);
          if (splitAns.length > 1) {
            detectedAnswer = splitAns;
            detectedMultipleAnswers = true;
            continue;
          }
        }
        detectedAnswer = rawAns.replace(/^[\(\[]|[\)\]]$/g, '');
        continue;
      }

      const marksMatch = trimmed.match(marksRegex);
      if (marksMatch) {
        detectedMarks = parseFloat(marksMatch[1]);
        continue;
      }

      const negMatch = trimmed.match(negativeMarksRegex);
      if (negMatch) {
        detectedNegativeMarks = parseFloat(negMatch[1]);
        continue;
      }

      const diffMatch = trimmed.match(difficultyRegex);
      if (diffMatch) {
        detectedDifficulty = diffMatch[1].toUpperCase();
        continue;
      }

      const catMatch = trimmed.match(categoryRegex);
      if (catMatch) {
        detectedCategory = catMatch[1].trim();
        continue;
      }

      const optMatch = trimmed.match(optionRegex);
      if (optMatch) {
        const letter = (optMatch[1] || optMatch[2] || '').toUpperCase();
        const optionText = optMatch[3].trim();
        rawOptions.push({ letter, text: optionText });
        inOptionsPhase = true;
        continue;
      }

      if (inOptionsPhase && rawOptions.length > 0) {
        rawOptions[rawOptions.length - 1].text += ' ' + trimmed;
        continue;
      }

      questionTextLines.push(line);
    }

    while (questionTextLines.length > 0 && !questionTextLines[questionTextLines.length - 1].trim()) {
      questionTextLines.pop();
    }
    const questionText = questionTextLines.join('\n');

    let questionType = 'MCQ';
    let multipleCorrect = false;

    if (rawOptions.length >= 2) {
      if (detectedMultipleAnswers || Array.isArray(detectedAnswer)) {
        questionType = 'MCQ';
        multipleCorrect = true;
      } else {
        questionType = 'MCQ';
        multipleCorrect = false;
      }
    } else {
      const lowerText = questionText.toLowerCase();
      const hasDescriptiveKeyword = /\b(explain|describe|discuss|elaborate|difference between|compare|advantages and disadvantages|write a python program|write a program|write code)\b/i.test(lowerText);
      if (hasDescriptiveKeyword || (detectedMarks && detectedMarks >= 5)) {
        questionType = 'LONG_ANSWER';
      } else {
        questionType = 'SHORT_ANSWER';
      }
    }

    if (format === 'LONG_ANSWER') questionType = 'LONG_ANSWER';
    else if (format === 'SHORT_ANSWER') questionType = 'SHORT_ANSWER';
    else if (format === 'MCQ' && rawOptions.length >= 2) questionType = 'MCQ';

    const options = rawOptions.map((opt, oIdx) => ({
      _id: generateTempId(),
      letter: opt.letter || String.fromCharCode(65 + oIdx),
      text: opt.text,
      order: oIdx,
    }));

    let resolvedCorrectAnswer = '';
    let answerStatus = 'VALID';

    if (questionType === 'MCQ') {
      if (!detectedAnswer && detectedAnswer !== 0) {
        answerStatus = 'MISSING_ANSWER';
      } else if (multipleCorrect || Array.isArray(detectedAnswer)) {
        const answersToMatch = Array.isArray(detectedAnswer) ? detectedAnswer : [detectedAnswer];
        const matchedLetters = [];
        answersToMatch.forEach((ans) => {
          const ansStr = String(ans).trim();
          const foundByLetter = options.find((o) => o.letter.toUpperCase() === ansStr.toUpperCase());
          if (foundByLetter) {
            matchedLetters.push(foundByLetter.letter);
            return;
          }
          const foundByText = options.find((o) => o.text.toLowerCase() === ansStr.toLowerCase());
          if (foundByText) {
            matchedLetters.push(foundByText.letter);
          }
        });

        if (matchedLetters.length > 0) {
          resolvedCorrectAnswer = matchedLetters;
        } else {
          answerStatus = 'MISSING_ANSWER';
          resolvedCorrectAnswer = [];
        }
      } else {
        const ansStr = String(detectedAnswer).trim();
        const foundByLetter = options.find((o) => o.letter.toUpperCase() === ansStr.toUpperCase());
        if (foundByLetter) {
          resolvedCorrectAnswer = foundByLetter.letter;
        } else {
          const foundByText = options.find((o) => o.text.toLowerCase() === ansStr.toLowerCase());
          if (foundByText) {
            resolvedCorrectAnswer = foundByLetter ? foundByLetter.letter : foundByText.letter;
          } else {
            const num = parseInt(ansStr, 10);
            if (!isNaN(num) && num >= 1 && num <= options.length) {
              resolvedCorrectAnswer = options[num - 1].letter;
            } else {
              answerStatus = 'MISSING_ANSWER';
              resolvedCorrectAnswer = '';
            }
          }
        }
      }
    } else {
      resolvedCorrectAnswer = detectedAnswer ? String(detectedAnswer).trim() : '';
      if (!resolvedCorrectAnswer) {
        answerStatus = 'REVIEW';
      }
    }

    let status = 'VALID';
    if (!questionText.trim()) {
      status = 'INVALID';
    } else if (questionType === 'MCQ' && options.length < 2) {
      status = 'INVALID_OPTIONS';
    } else if (answerStatus === 'MISSING_ANSWER') {
      status = 'MISSING_ANSWER';
    } else if (questionType === 'LONG_ANSWER' && !resolvedCorrectAnswer) {
      status = 'REVIEW';
    }

    const marks = detectedMarks !== null ? detectedMarks : defaultMarks;
    const negativeMarks = detectedNegativeMarks !== null ? detectedNegativeMarks : defaultNegativeMarks;
    const difficulty = detectedDifficulty || defaultDifficulty;
    const category = detectedCategory || defaultCategory;

    return {
      _id: generateTempId(),
      originalIndex: index + 1,
      questionText,
      questionType,
      options,
      correctAnswer: resolvedCorrectAnswer,
      multipleCorrect,
      marks: Math.max(0, marks),
      negativeMarks: Math.max(0, negativeMarks),
      difficulty,
      category,
      explanation: detectedExplanation,
      evaluationMode: questionType === 'LONG_ANSWER' ? 'MANUAL' : 'CASE_INSENSITIVE',
      status,
    };
  });

  const totalMarks = parsedQuestions.reduce((sum, q) => sum + (q.marks || 0), 0);
  const summary = {
    total: parsedQuestions.length,
    valid: parsedQuestions.filter((q) => q.status === 'VALID').length,
    missingAnswer: parsedQuestions.filter((q) => q.status === 'MISSING_ANSWER').length,
    review: parsedQuestions.filter((q) => q.status === 'REVIEW' || q.status === 'INVALID_OPTIONS' || q.status === 'INVALID').length,
    totalMarks,
  };

  return {
    title,
    questions: parsedQuestions,
    totalMarks,
    summary,
  };
};
