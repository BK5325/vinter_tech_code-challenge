const { parseRawQuestions } = require('../services/questionParser');

describe('Question Parser Tests (Features 4, 5, 6, 7, 8)', () => {
  test('Parses 5 MCQs from standard pasted text', () => {
    const rawText = `Python Quiz – 5 MCQs

1. What is the output of the following Python code?
x = 10
print(type(x))

A. <class 'bool'>
B. <class 'str'>
C. <class 'int'>
D. <class 'float'>

Answer: C
Marks: 2

2. What is the output of this code?
print(7 // 2)

A. 3
B. 1
C. 3.5
D. 4

Answer: A
Marks: 2

3. Which keyword is used to check an additional condition when the preceding if condition is false?

A. elif
B. switch
C. else if
D. then

Answer: A
Marks: 2

4. What is the output of the following code?

x = 5
if x > 3:
    print("Yes")
else:
    print("No")

A. True
B. Yes
C. No
D. 5

Answer: B
Marks: 2

5. What is the output of the following code?
print(10 % 3)

A. 0
B. 3.33
C. 1
D. 3

Answer: C
Marks: 2`;

    const result = parseRawQuestions(rawText);

    expect(result.questions).toHaveLength(5);
    expect(result.totalMarks).toBe(10);
    expect(result.summary.valid).toBe(5);
    expect(result.summary.missingAnswer).toBe(0);

    // Question 1 assertions
    const q1 = result.questions[0];
    expect(q1.questionText).toContain("x = 10\nprint(type(x))");
    expect(q1.questionType).toBe('MCQ');
    expect(q1.options).toHaveLength(4);
    expect(q1.options[2].text).toBe("<class 'int'>");
    expect(q1.correctAnswer).toBe('C');
    expect(q1.marks).toBe(2);

    // Question 2 assertions
    const q2 = result.questions[1];
    expect(q2.correctAnswer).toBe('A');
    expect(q2.marks).toBe(2);

    // Question 4 assertions: check code indentation preservation
    const q4 = result.questions[3];
    expect(q4.questionText).toContain('    print("Yes")');
  });

  test('Supports text-based answer mapping to option letters', () => {
    const rawText = `1. What is the type of 10?
A. bool
B. int
C. float
Correct Answer: int
Marks: 3`;

    const result = parseRawQuestions(rawText);
    expect(result.questions).toHaveLength(1);
    expect(result.questions[0].correctAnswer).toBe('B'); // mapped "int" to option B
    expect(result.questions[0].marks).toBe(3);
  });

  test('Supports Multiple Select questions with multiple correct options', () => {
    const rawText = `1. Which of the following are Python collection types?
A. list
B. tuple
C. integer
D. set
Correct Answers: A, B, D
Marks: 4`;

    const result = parseRawQuestions(rawText);
    expect(result.questions).toHaveLength(1);
    const q = result.questions[0];
    expect(q.multipleCorrect).toBe(true);
    expect(q.correctAnswer).toEqual(['A', 'B', 'D']);
    expect(q.marks).toBe(4);
  });

  test('Detects Short Answer and Long Answer question types', () => {
    const rawText = `1. What is the keyword for defining a function in Python?
Answer: def
Marks: 1

2. Explain the difference between mutable and immutable data types in Python with suitable examples.
Answer: Mutable types can be changed in place (e.g. list, dict). Immutable types cannot be changed (e.g. int, str, tuple).
Marks: 5`;

    const result = parseRawQuestions(rawText);
    expect(result.questions).toHaveLength(2);
    expect(result.questions[0].questionType).toBe('SHORT_ANSWER');
    expect(result.questions[0].correctAnswer).toBe('def');

    expect(result.questions[1].questionType).toBe('LONG_ANSWER');
    expect(result.questions[1].marks).toBe(5);
  });

  test('Flags questions with missing answers appropriately', () => {
    const rawText = `1. Question without answer
A. Option 1
B. Option 2
C. Option 3

2. Question with answer
A. Option 1
B. Option 2
Answer: A`;

    const result = parseRawQuestions(rawText);
    expect(result.questions).toHaveLength(2);
    expect(result.questions[0].status).toBe('MISSING_ANSWER');
    expect(result.questions[1].status).toBe('VALID');
    expect(result.summary.missingAnswer).toBe(1);
  });

  test('Supports custom options formatting like A), (b), A:', () => {
    const rawText = `1. What is the output?
A) First
B) Second
(c) Third
(d) Fourth
Answer: C`;

    const result = parseRawQuestions(rawText);
    expect(result.questions).toHaveLength(1);
    expect(result.questions[0].options).toHaveLength(4);
    expect(result.questions[0].options[0].text).toBe('First');
    expect(result.questions[0].correctAnswer).toBe('C');
  });

  test('Preserves multiline code indentation and operators', () => {
    const rawText = `1. Predict the output:
def calculate(a, b):
    result = a ** 2 + b ** 2
    if result > 10:
        return True
    return False

print(calculate(2, 3))

A. True
B. False
Answer: B
Marks: 3`;

    const result = parseRawQuestions(rawText);
    expect(result.questions).toHaveLength(1);
    const q = result.questions[0];
    expect(q.questionText).toContain('    result = a ** 2 + b ** 2');
    expect(q.questionText).toContain('        return True');
  });
});
