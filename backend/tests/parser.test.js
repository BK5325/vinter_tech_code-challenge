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
    expect(q1.questionType).toBe('OMR');
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

  test('Parses full 50-Question Python Developer Assessment with zero errors, cautions, or missing answers', () => {
    const assessment50 = `Python Developer Interview Assessment – 50 Questions

Question 1:
Which of the following are Python collection types? Select all correct answers.

A. list
B. tuple
C. integer
D. set

Correct Answers: A, B, D
Marks: 2
Negative Marks: 0.5
Difficulty: Easy
Category: Python Fundamentals

Question 2:
What is the output of the following code?

x = 10
print(type(x))

A. <class 'str'>
B. <class 'float'>
C. <class 'int'>
D. <class 'bool'>

Correct Answer: C
Marks: 2
Negative Marks: 0.5
Difficulty: Easy
Category: Python Fundamentals

Question 3:
What is the output of the following code?

print(7 // 2)

A. 3.5
B. 3
C. 4
D. 1

Correct Answer: B
Marks: 2
Negative Marks: 0.5
Difficulty: Easy
Category: Operators

Question 4:
What is the output of the following code?

print(10 % 3)

A. 3
B. 0
C. 3.33
D. 1

Correct Answer: D
Marks: 2
Negative Marks: 0.5
Difficulty: Easy
Category: Operators

Question 5:
Which of the following statements about Python dictionaries are correct? Select all correct answers.

A. Dictionaries store key-value pairs.
B. Dictionary keys must be unique.
C. Dictionary values must all have the same data type.
D. Dictionaries preserve insertion order in modern Python.

Correct Answers: A, B, D
Marks: 2
Negative Marks: 0.5
Difficulty: Easy
Category: Data Structures

Question 6:
What is the output of the following code?

x = [1, 2, 3]
x.append([4, 5])
print(len(x))

A. 3
B. 4
C. 5
D. 6

Correct Answer: B
Marks: 2
Negative Marks: 0.5
Difficulty: Easy
Category: Lists

Question 7:
Which statement correctly describes the difference between a list and a tuple?

A. Lists are immutable, but tuples are mutable.
B. Both lists and tuples are immutable.
C. Lists are mutable, but tuples are immutable.
D. Tuples can store only integers.

Correct Answer: C
Marks: 2
Negative Marks: 0.5
Difficulty: Easy
Category: Data Structures

Question 8:
What is the output of the following code?

a = [10, 20, 30, 40]
print(a[-2])

A. 20
B. 30
C. 40
D. 10

Correct Answer: B
Marks: 2
Negative Marks: 0.5
Difficulty: Easy
Category: Lists

Question 9:
What is the output of the following code?

print(bool([]), bool([0]))

A. False False
B. True False
C. True True
D. False True

Correct Answer: D
Marks: 2
Negative Marks: 0.5
Difficulty: Medium
Category: Type Conversion

Question 10:
Which operator checks whether two variables refer to the same object?

A. ==
B. is
C. !=
D. in

Correct Answer: B
Marks: 2
Negative Marks: 0.5
Difficulty: Easy
Category: Operators

Question 11:
What is the output of the following code?

for i in range(2, 7, 2):
    print(i, end=" ")

A. 2 3 4 5 6
B. 2 4 6
C. 2 4 6 8
D. 3 5 7

Correct Answer: B
Marks: 2
Negative Marks: 0.5
Difficulty: Easy
Category: Loops

Question 12:
What is the output of the following code?

x = 5

if x > 3:
    print("A")
elif x > 1:
    print("B")
else:
    print("C")

A. A
B. B
C. C
D. A B

Correct Answer: A
Marks: 2
Negative Marks: 0.5
Difficulty: Easy
Category: Conditional Statements

Question 13:
Which statements about Python functions are correct? Select all correct answers.

A. A function can return multiple values.
B. A function must always contain a return statement.
C. A function can accept default arguments.
D. A function can accept keyword arguments.

Correct Answers: A, C, D
Marks: 2
Negative Marks: 0.5
Difficulty: Medium
Category: Functions

Question 14:
What is the output of the following code?

def add(a, b=5):
    return a + b

print(add(3))

A. 3
B. 5
C. 8
D. TypeError

Correct Answer: C
Marks: 2
Negative Marks: 0.5
Difficulty: Easy
Category: Functions

Question 15:
What is the output of the following code?

x = 10

def change():
    x = 20

change()
print(x)

A. 10
B. 20
C. None
D. NameError

Correct Answer: A
Marks: 2
Negative Marks: 0.5
Difficulty: Medium
Category: Scope

Question 16:
Which statement about *args and **kwargs is correct?

A. Both accept only integer arguments.
B. *args collects positional arguments into a tuple, while **kwargs collects keyword arguments into a dictionary.
C. *args collects keyword arguments into a dictionary.
D. **kwargs collects positional arguments into a list.

Correct Answer: B
Marks: 2
Negative Marks: 0.5
Difficulty: Medium
Category: Functions

Question 17:
What is the output of the following code?

square = lambda x: x ** 2
print(square(4))

A. 8
B. 12
C. 16
D. 64

Correct Answer: C
Marks: 2
Negative Marks: 0.5
Difficulty: Easy
Category: Lambda Functions

Question 18:
What is the output of the following code?

numbers = [1, 2, 3, 4]
result = list(map(lambda x: x * 2, numbers))
print(result)

A. [1, 2, 3, 4]
B. [2, 4, 6, 8]
C. [1, 4, 9, 16]
D. [2, 3, 4, 5]

Correct Answer: B
Marks: 2
Negative Marks: 0.5
Difficulty: Medium
Category: Functional Programming

Question 19:
What is the output of the following code?

numbers = [1, 2, 3, 4, 5, 6]
result = list(filter(lambda x: x % 2 == 0, numbers))
print(result)

A. [1, 3, 5]
B. [2, 4, 6]
C. [1, 2, 3, 4, 5, 6]
D. [2, 3, 4, 5, 6]

Correct Answer: B
Marks: 2
Negative Marks: 0.5
Difficulty: Medium
Category: Functional Programming

Question 20:
What is the output of the following code?

numbers = [1, 2, 3]
print([x * x for x in numbers])

A. [1, 2, 3]
B. [2, 4, 6]
C. [1, 4, 9]
D. [1, 8, 27]

Correct Answer: C
Marks: 2
Negative Marks: 0.5
Difficulty: Easy
Category: List Comprehension

Question 21:
Which statements about object-oriented programming in Python are correct? Select all correct answers.

A. A class defines a structure and behavior for its instances.
B. An object is an instance of a class.
C. A constructor-like initializer is commonly implemented using __init__().
D. Python classes cannot contain methods.

Correct Answers: A, B, C
Marks: 3
Negative Marks: 0.5
Difficulty: Easy
Category: OOP

Question 22:
What is the output of the following code?

class Student:
    def __init__(self, name):
        self.name = name

s = Student("Arun")
print(s.name)

A. Student
B. name
C. Arun
D. None

Correct Answer: C
Marks: 3
Negative Marks: 0.5
Difficulty: Easy
Category: OOP

Question 23:
What is the purpose of self in an ordinary instance method?

A. It refers to the current instance.
B. It creates a new class.
C. It makes a method static.
D. It imports another module.

Correct Answer: A
Marks: 3
Negative Marks: 0.5
Difficulty: Easy
Category: OOP

Question 24:
What is method overriding?

A. Defining two unrelated classes.
B. Replacing a parent class method's implementation in a subclass.
C. Deleting a method at runtime.
D. Calling a method without parentheses.

Correct Answer: B
Marks: 3
Negative Marks: 0.5
Difficulty: Medium
Category: Inheritance

Question 25:
Which statements about inheritance in Python are correct? Select all correct answers.

A. A subclass can inherit methods from a parent class.
B. Python supports multiple inheritance.
C. Every subclass must override every inherited method.
D. super() can be used to access parent-class behavior through the method resolution order.

Correct Answers: A, B, D
Marks: 3
Negative Marks: 0.5
Difficulty: Medium
Category: Inheritance

Question 26:
What is the output of the following code?

class Example:
    count = 0

    def __init__(self):
        Example.count += 1

a = Example()
b = Example()
print(Example.count)

A. 0
B. 1
C. 2
D. 3

Correct Answer: C
Marks: 3
Negative Marks: 0.5
Difficulty: Medium
Category: Class Variables

Question 27:
Which statements about Python exception handling are correct? Select all correct answers.

A. try contains code that may raise an exception.
B. except can handle matching exceptions.
C. finally is generally used for cleanup that should run whether an exception occurs or not.
D. Every exception must be handled using except Exception.

Correct Answers: A, B, C
Marks: 3
Negative Marks: 0.5
Difficulty: Medium
Category: Exception Handling

Question 28:
What is the output of the following code?

try:
    print(10 / 0)
except ZeroDivisionError:
    print("Cannot divide")

A. 0
B. Cannot divide
C. ZeroDivisionError
D. None

Correct Answer: B
Marks: 3
Negative Marks: 0.5
Difficulty: Easy
Category: Exception Handling

Question 29:
Which keyword is used to raise an exception explicitly?

A. throws
B. exception
C. raise
D. error

Correct Answer: C
Marks: 3
Negative Marks: 0.5
Difficulty: Easy
Category: Exception Handling

Question 30:
Which statements about Python file handling are correct? Select all correct answers.

A. open() can open a file.
B. The with statement can help ensure that a file is closed after its block finishes.
C. The "a" mode is commonly used to append to a file.
D. The "w" mode always preserves existing file contents.

Correct Answers: A, B, C
Marks: 3
Negative Marks: 0.5
Difficulty: Medium
Category: File Handling

Question 31:
What is the output of the following code?

with open("example.txt", "w") as file:
    file.write("Python")

with open("example.txt", "r") as file:
    print(file.read())

A. example.txt
B. Python
C. None
D. FileNotFoundError

Correct Answer: B
Marks: 3
Negative Marks: 0.5
Difficulty: Medium
Category: File Handling

Question 32:
What is a generator in Python?

A. A function that can produce values lazily using yield.
B. A class that must inherit from list.
C. A function that can return only integers.
D. A module used only for random numbers.

Correct Answer: A
Marks: 3
Negative Marks: 0.5
Difficulty: Medium
Category: Generators

Question 33:
What is the output of the following code?

def generate():
    yield 10
    yield 20

g = generate()
print(next(g))
print(next(g))

A. 20 followed by 10
B. 10 followed by 20
C. 10 followed by 10
D. TypeError

Correct Answer: B
Marks: 3
Negative Marks: 0.5
Difficulty: Medium
Category: Iterators and Generators

Question 34:
Which statements about Python iterators are correct? Select all correct answers.

A. An iterator provides values one at a time.
B. iter() can obtain an iterator from an iterable.
C. next() retrieves the next item from an iterator.
D. Every iterable must be a generator.

Correct Answers: A, B, C
Marks: 3
Negative Marks: 0.5
Difficulty: Medium
Category: Iterators

Question 35:
What is the purpose of a decorator in Python?

A. To modify or extend a function or class without directly changing its original definition.
B. To convert every function into a generator.
C. To create a database automatically.
D. To prevent a function from returning a value.

Correct Answer: A
Marks: 3
Negative Marks: 0.5
Difficulty: Medium
Category: Decorators

Question 36:
Which statements about Python modules and packages are correct? Select all correct answers.

A. A module is commonly a Python file containing definitions and statements.
B. A package organizes related modules.
C. import is used to access module functionality.
D. Every Python module must be installed using pip.

Correct Answers: A, B, C
Marks: 3
Negative Marks: 0.5
Difficulty: Easy
Category: Modules and Packages

Question 37:
What is the primary purpose of a virtual environment in Python development?

A. To make every program run faster.
B. To isolate project dependencies.
C. To replace the Python interpreter.
D. To convert Python code into HTML.

Correct Answer: B
Marks: 3
Negative Marks: 0.5
Difficulty: Easy
Category: Development Tools

Question 38:
Which statement about Python's Global Interpreter Lock (GIL) is generally correct for a conventional GIL-enabled CPython build?

A. It prevents all concurrent execution of Python programs.
B. It allows only one thread at a time to execute Python bytecode within a process.
C. It prevents multiprocessing.
D. It guarantees that every multithreaded program is faster.

Correct Answer: B
Marks: 3
Negative Marks: 0.5
Difficulty: Hard
Category: Concurrency

Question 39:
Which statements about threading and multiprocessing are correct? Select all correct answers.

A. Threading can be useful for I/O-bound tasks.
B. Multiprocessing can use separate processes for CPU-bound work.
C. Multiprocessing always consumes less memory than threading.
D. Threads share the process's memory space.

Correct Answers: A, B, D
Marks: 3
Negative Marks: 0.5
Difficulty: Hard
Category: Concurrency

Question 40:
What is the purpose of the __name__ == "__main__" check?

A. To ensure that a module can never be imported.
B. To execute a block when the file is run as the top-level program.
C. To create a class automatically.
D. To install all dependencies.

Correct Answer: B
Marks: 3
Negative Marks: 0.5
Difficulty: Medium
Category: Python Modules

Question 41:
Programming Question: Write a Python program to count the frequency of each character in a string.

Input:
banana

Expected Output:
b: 1
a: 3
n: 2

Marks: 5
Negative Marks: 0
Difficulty: Medium
Category: Programming

Question 42:
Programming Question: Write a Python program to remove duplicate elements from a list while preserving their original order.

Input:
[3, 1, 3, 2, 1, 4]

Expected Output:
[3, 1, 2, 4]

Marks: 5
Negative Marks: 0
Difficulty: Medium
Category: Lists

Question 43:
Programming Question: Write a Python program to determine whether a string is a palindrome, ignoring letter case.

Input:
Madam

Expected Output:
True

Marks: 5
Negative Marks: 0
Difficulty: Medium
Category: Strings

Question 44:
Programming Question: Write a Python program to find the second-largest distinct number in a list.

Input:
[10, 5, 8, 10, 7]

Expected Output:
8

Marks: 5
Negative Marks: 0
Difficulty: Medium
Category: Lists

Question 45:
Programming Question: Write a Python program to find the first non-repeating character in a string. If no such character exists, print -1.

Input:
aabbcddee

Expected Output:
c

Marks: 5
Negative Marks: 0
Difficulty: Medium
Category: Strings

Question 46:
Programming Question: Write a Python function that checks whether two strings are anagrams, ignoring letter case.

Input:
listen
silent

Expected Output:
True

Marks: 5
Negative Marks: 0
Difficulty: Medium
Category: Strings

Question 47:
Programming Question: Write a Python program to calculate the factorial of a non-negative integer using recursion.

Input:
5

Expected Output:
120

Marks: 5
Negative Marks: 0
Difficulty: Medium
Category: Recursion

Question 48:
Programming Question: Write a Python program to find the missing number in a list containing distinct integers from 1 through n, with exactly one number missing.

Input:
n = 5
numbers = [1, 2, 4, 5]

Expected Output:
3

Marks: 5
Negative Marks: 0
Difficulty: Medium
Category: Problem Solving

Question 49:
Programming Question: Write a Python program to find the first pair of numbers in a list whose sum equals a given target. Return the pair of values or print -1 if no pair exists.

Input:
numbers = [2, 7, 11, 15]
target = 9

Expected Output:
[2, 7]

Marks: 5
Negative Marks: 0
Difficulty: Hard
Category: Algorithms

Question 50:
Programming Question: Write a Python function that groups words that are anagrams of one another.

Input:
["eat", "tea", "tan", "ate", "nat", "bat"]

Expected Output:
Groups may appear in any order:
["eat", "tea", "ate"]
["tan", "nat"]
["bat"]

Marks: 5
Negative Marks: 0
Difficulty: Hard
Category: Algorithms i actually gave this as an input but i parse to only one questions and also mark sure parsing must done perfectly without zero error or caution or problem so make sure of it parse correctly`;

    const result = parseRawQuestions(assessment50);

    expect(result.title).toBe('Python Developer Interview Assessment – 50 Questions');
    expect(result.questions).toHaveLength(50);
    expect(result.summary.total).toBe(50);
    expect(result.summary.valid).toBe(50);
    expect(result.summary.missingAnswer).toBe(0);
    expect(result.summary.review).toBe(0);
    expect(result.totalMarks).toBe(150);

    // Q1 check
    const q1 = result.questions[0];
    expect(q1.questionType).toBe('MCQ');
    expect(q1.multipleCorrect).toBe(true);
    expect(q1.correctAnswer).toEqual(['A', 'B', 'D']);
    expect(q1.marks).toBe(2);
    expect(q1.negativeMarks).toBe(0.5);
    expect(q1.difficulty).toBe('EASY');
    expect(q1.category).toBe('Python Fundamentals');
    expect(q1.status).toBe('VALID');

    // Q2 check (Single choice -> OMR)
    const q2 = result.questions[1];
    expect(q2.questionType).toBe('OMR');
    expect(q2.multipleCorrect).toBe(false);
    expect(q2.correctAnswer).toBe('C');
    expect(q2.options).toHaveLength(4);
    expect(q2.status).toBe('VALID');

    // Q41 check (Programming / Long Answer)
    const q41 = result.questions[40];
    expect(q41.questionType).toBe('LONG_ANSWER');
    expect(q41.marks).toBe(5);
    expect(q41.negativeMarks).toBe(0);
    expect(q41.difficulty).toBe('MEDIUM');
    expect(q41.category).toBe('Programming');
    expect(q41.correctAnswer).toContain('b: 1');
    expect(q41.correctAnswer).toContain('a: 3');
    expect(q41.correctAnswer).toContain('n: 2');
    expect(q41.status).toBe('VALID');

    // Q50 check
    const q50 = result.questions[49];
    expect(q50.questionType).toBe('LONG_ANSWER');
    expect(q50.marks).toBe(5);
    expect(q50.difficulty).toBe('HARD');
    expect(q50.category).toBe('Algorithms'); // chatter cleanly stripped
    expect(q50.correctAnswer).toContain('["eat", "tea", "ate"]');
    expect(q50.status).toBe('VALID');
  });

  test('Supports explicit Type tags for OMR, MCQ, SHORT_ANSWER, and LONG_ANSWER', () => {
    const raw = `1. Single choice question
Type: OMR
A. Opt 1
B. Opt 2
Answer: A

2. Multiple select question
Type: MCQ
A. Opt 1
B. Opt 2
Answers: A, B

3. Short answer question
Type: Short Answer
What is the keyword?
Answer: def

4. Long answer question
Type: Long Answer
Describe how Python memory management works.
Expected Output: Reference counting and cyclic garbage collection.
Marks: 10`;

    const result = parseRawQuestions(raw);
    expect(result.questions).toHaveLength(4);
    expect(result.questions[0].questionType).toBe('OMR');
    expect(result.questions[1].questionType).toBe('MCQ');
    expect(result.questions[2].questionType).toBe('SHORT_ANSWER');
    expect(result.questions[3].questionType).toBe('LONG_ANSWER');
    expect(result.summary.valid).toBe(4);
  });
});


