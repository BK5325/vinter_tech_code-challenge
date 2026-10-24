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

  // Matches "Question 1:", "Question 1", "Q1:", "1.", "1)", "(1)", "[1]", "Programming Question 1:", etc.
  // with or without trailing question text on the same line
  const questionNumberRegex = /^\s*(?:(?:(?:Programming\s+)?(?:Question|Problem)|Q)\s*[\.\:\-]?\s*(\d+)[\.\)\:\-\]]?|(\d+)[\.\)\:\-\]]|\((\d+)\)|\[(\d+)\])\s*(.*)$/i;
  const optionRegex = /^\s*(?:\(?([A-Za-z])[\.\)\:\-]\s+|\[([A-Za-z])\]\s*)(.+)$/;

  const answerRegex = /^\s*(?:Correct\s+Answers?|Correct\s+Options?|Answers?|Ans|Key)\s*[\:\-]\s*(.+)$/i;
  const expectedOutputRegex = /^\s*(?:Expected\s+(?:Output|Answers?|Result)s?|Sample\s+Output|Output)\s*[\:\-]?\s*(.*)$/i;
  const typeRegex = /^\s*(?:Question\s+)?Type\s*[\:\-]\s*(OMR|MCQ|SHORT_ANSWER|LONG_ANSWER|SHORT|LONG|DESCRIPTIVE|PROGRAMMING)/i;
  const marksRegex = /^\s*(?:Maximum\s+Marks?|Max\s+Marks?|Marks?|Points?|Weightage)\s*[\:\-]\s*(\d+(?:\.\d+)?)/i;
  const inlineMarksRegex = /[\[\(]\s*(\d+(?:\.\d+)?)\s*(?:marks?|pts?|points?)\s*[\]\)]/i;
  const negativeMarksRegex = /^\s*(?:Negative(?:\s+Marks?)?|Penalty)\s*[\:\-]\s*(\d+(?:\.\d+)?)/i;
  const difficultyRegex = /^\s*(?:Difficulty(?:\s+Level)?|Level)\s*[\:\-]\s*(Easy|Medium|Hard)/i;
  const categoryRegex = /^\s*(?:Category|Topic|Subject|Module|Tag|Section)\s*[\:\-]\s*(.+)$/i;
  const explanationRegex = /^\s*(?:Explanation|Explain|Solution|Rationale)\s*[\:\-]\s*(.*)$/i;
  const chatterRegex = /^\s*(?:i\s+actually|please\s+(?:make\s+sure|note)|make\s+sure\b).*$/i;

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
    let detectedType = null;
    let detectedMarks = null;
    let detectedNegativeMarks = null;
    let detectedDifficulty = null;
    let detectedCategory = null;
    let detectedExplanation = '';
    let isParsingExplanation = false;
    let isParsingExpectedOutput = false;
    let detectedExpectedOutputLines = [];
    let inOptionsPhase = false;

    const firstLine = blockLines[0] || '';
    const firstMatch = firstLine.trim().match(questionNumberRegex);
    let startText = '';
    if (firstMatch) {
      startText = firstMatch[firstMatch.length - 1] || '';
    } else {
      startText = firstLine;
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

      if (chatterRegex.test(trimmed)) {
        continue;
      }

      if (!trimmed) {
        if (isParsingExplanation) {
          detectedExplanation += '\n';
        } else if (isParsingExpectedOutput) {
          detectedExpectedOutputLines.push('');
          questionTextLines.push('');
        } else if (!inOptionsPhase) {
          questionTextLines.push('');
        }
        continue;
      }

      const expMatch = trimmed.match(explanationRegex);
      if (expMatch) {
        isParsingExplanation = true;
        isParsingExpectedOutput = false;
        inOptionsPhase = false;
        detectedExplanation = expMatch[1] || '';
        continue;
      }

      const marksMatch = trimmed.match(marksRegex);
      const negMatch = trimmed.match(negativeMarksRegex);
      const diffMatch = trimmed.match(difficultyRegex);
      const catMatch = trimmed.match(categoryRegex);
      const ansMatch = trimmed.match(answerRegex);
      const expOutMatch = trimmed.match(expectedOutputRegex);
      const typeMatch = trimmed.match(typeRegex);

      if (isParsingExplanation) {
        if (!marksMatch && !negMatch && !diffMatch && !catMatch && !ansMatch && !expOutMatch && !typeMatch) {
          detectedExplanation += (detectedExplanation ? '\n' : '') + trimmed;
          continue;
        } else {
          isParsingExplanation = false;
        }
      }

      if (isParsingExpectedOutput) {
        if (!marksMatch && !negMatch && !diffMatch && !catMatch && !ansMatch && !typeMatch) {
          detectedExpectedOutputLines.push(trimmed);
          questionTextLines.push(line);
          continue;
        } else {
          isParsingExpectedOutput = false;
        }
      }

      if (typeMatch) {
        const rawType = typeMatch[1].toUpperCase();
        if (rawType === 'OMR') detectedType = 'OMR';
        else if (rawType === 'MCQ') detectedType = 'MCQ';
        else if (rawType.startsWith('SHORT')) detectedType = 'SHORT_ANSWER';
        else if (rawType.startsWith('LONG') || rawType === 'DESCRIPTIVE' || rawType === 'PROGRAMMING') detectedType = 'LONG_ANSWER';
        inOptionsPhase = false;
        isParsingExpectedOutput = false;
        continue;
      }

      if (expOutMatch) {
        isParsingExpectedOutput = true;
        isParsingExplanation = false;
        inOptionsPhase = false;
        questionTextLines.push(line);
        if (expOutMatch[1] && expOutMatch[1].trim()) {
          detectedExpectedOutputLines.push(expOutMatch[1].trim());
        }
        continue;
      }

      if (ansMatch) {
        inOptionsPhase = false;
        isParsingExpectedOutput = false;
        isParsingExplanation = false;
        const rawAns = ansMatch[1].trim().replace(/[\.\s]+$/, '');
        if (rawAns.includes(',') || rawAns.includes(';') || /\b(?:and|&)\b/i.test(rawAns)) {
          const splitAns = rawAns
            .split(/[,;&]|\band\b/i)
            .map((s) => s.trim().replace(/^[\(\[]|[\)\]]$/g, '').replace(/[\.\s]+$/, ''))
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

      if (marksMatch) {
        detectedMarks = parseFloat(marksMatch[1]);
        inOptionsPhase = false;
        isParsingExpectedOutput = false;
        continue;
      }

      if (negMatch) {
        detectedNegativeMarks = parseFloat(negMatch[1]);
        inOptionsPhase = false;
        isParsingExpectedOutput = false;
        continue;
      }

      if (diffMatch) {
        detectedDifficulty = diffMatch[1].toUpperCase();
        inOptionsPhase = false;
        isParsingExpectedOutput = false;
        continue;
      }

      if (catMatch) {
        let cat = catMatch[1].trim();
        cat = cat.replace(/\s+(?:i\s+actually|please\b|note[\:\s]|make\s+sure\b).*$/i, '').trim();
        detectedCategory = cat;
        inOptionsPhase = false;
        isParsingExpectedOutput = false;
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

    if (!detectedAnswer && detectedExpectedOutputLines.length > 0) {
      detectedAnswer = detectedExpectedOutputLines.filter((l) => l.trim()).join('\n').trim();
    }

    while (questionTextLines.length > 0 && !questionTextLines[questionTextLines.length - 1].trim()) {
      questionTextLines.pop();
    }
    const questionText = questionTextLines.join('\n');

    let questionType = 'OMR';
    let multipleCorrect = false;

    if (rawOptions.length >= 2) {
      if (detectedType === 'MCQ') {
        questionType = 'MCQ';
        multipleCorrect = detectedMultipleAnswers || Array.isArray(detectedAnswer);
      } else if (detectedType === 'OMR') {
        questionType = 'OMR';
        multipleCorrect = false;
      } else if (format === 'OMR') {
        questionType = 'OMR';
        multipleCorrect = false;
      } else if (format === 'MCQ') {
        questionType = 'MCQ';
        multipleCorrect = detectedMultipleAnswers || Array.isArray(detectedAnswer);
      } else {
        // AUTO detection for options
        if (
          detectedMultipleAnswers ||
          Array.isArray(detectedAnswer) ||
          /\b(?:select all|choose all|multiple correct|all correct)\b/i.test(questionText)
        ) {
          questionType = 'MCQ';
          multipleCorrect = true;
        } else {
          // Single choice is OMR
          questionType = 'OMR';
          multipleCorrect = false;
        }
      }
    } else {
      const lowerText = questionText.toLowerCase();
      const hasDescriptiveKeyword = /\b(explain|describe|discuss|elaborate|difference between|compare|advantages and disadvantages|write a python program|write a program|write code|write a python function|programming question)\b/i.test(lowerText);
      if (
        detectedType === 'LONG_ANSWER' ||
        format === 'LONG_ANSWER' ||
        hasDescriptiveKeyword ||
        (detectedMarks && detectedMarks >= 5) ||
        detectedExpectedOutputLines.length > 0
      ) {
        questionType = 'LONG_ANSWER';
      } else {
        questionType = 'SHORT_ANSWER';
      }
    }

    const options = rawOptions.map((opt, oIdx) => ({
      _id: generateTempId(),
      letter: opt.letter || String.fromCharCode(65 + oIdx),
      text: opt.text,
      order: oIdx,
    }));

    let resolvedCorrectAnswer = '';
    let answerStatus = 'VALID';

    if (questionType === 'MCQ' || questionType === 'OMR') {
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
    } else if ((questionType === 'MCQ' || questionType === 'OMR') && options.length < 2) {
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
