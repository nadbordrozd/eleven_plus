// Learn pages for sequences and patterns. See docs/LEARN_GUIDELINES.md.
import { h, p, list, steps, key, display, note, mistake, frac, figure, example } from '../kit.js';

// A repeating floor pattern (block of 2 rows × 3 columns) with a 2 × 2 gap; the answer is panel C.
const tileBlock = [[1, 0, 3], [0, 2, 0]];
const tileCells = Array.from({ length: 6 }, (_, row) => Array.from({ length: 9 }, (__, col) => (
  row >= 2 && row <= 3 && col >= 4 && col <= 5 ? -1 : tileBlock[row % 2][col % 3]
)));
const tileVisual = {
  type: 'tile_pattern',
  cells: tileCells,
  gap: { row: 2, col: 4, rows: 2, cols: 2 },
  panels: [
    { cells: [[3, 0], [2, 0]], label: 'A' },
    { cells: [[0, 3], [0, 2]], label: 'B' },
    { cells: [[0, 3], [2, 0]], label: 'C' },
    { cells: [[0, 1], [2, 0]], label: 'D' },
    { cells: [[0, 3], [2, 2]], label: 'E' },
  ],
};

// Number grids: 7 columns A–G.
const gridRows = (first, step, cols, rows, snake = false) => Array.from({ length: rows }, (_, r) => {
  const row = Array.from({ length: cols }, (__, c) => String(first + step * (r * cols + c)));
  return [`Row ${r + 1}`, ...(snake && r % 2 === 1 ? row.reverse() : row)];
});
const letters = (cols) => ['', ...'ABCDEFG'.slice(0, cols).split('')];

export const pages = [
  {
    id: 'seq_arithmetic_geometric',
    title: 'Number sequences: finding the rule',
    skills: ['seq_arithmetic_geometric'],
    prereqs: ['ar_add_subtract_word', 'ar_multiplication_context'],
    summary: 'Spot the rule in a number sequence (adding, multiplying, growing gaps or adding the two before) and use it to find the next or a missing number.',
    body: [
      h('The big idea'),
      p('A <b>sequence</b> is a list of numbers that follows a rule, like the house numbers on one side of a street: 2, 4, 6, 8, … Each number in the list is called a <b>term</b>. The 1st term here is 2 and the 4th term is 8.'),
      p('To continue a sequence you need to find its rule. The best first step is nearly always to look at the <b>gaps</b>: how much you add or take away to get from each term to the next.'),
      key('Four rules to try, in this order', list([
        '<b>Same gap every time</b> (add or subtract the same number): 5, 9, 13, 17, … adds 4 each time.',
        '<b>Gaps that change in a pattern</b>: 21, 23, 26, 30, … adds 2, then 3, then 4, … Gaps can also take turns, like +5, +7, +5, +7.',
        '<b>Multiply or divide by the same number</b>: 3, 6, 12, 24, … doubles each time. Try this when the gaps grow very fast.',
        '<b>Add the two terms before</b>: 4, 1, 5, 6, 11, … (4 + 1 = 5, 1 + 5 = 6, 5 + 6 = 11).',
      ])),
      h('Method'),
      steps([
        'Write the gap between each pair of neighbours underneath, with + or −.',
        'If the gaps are all the same, keep adding (or taking away) that number.',
        'If the gaps change, look for a pattern in the gaps themselves and continue it.',
        'If the gaps grow quickly, divide each term by the one before to see whether you are multiplying by the same number each time.',
        'Otherwise, check whether each term is the total of the two before it.',
        'Check your rule works for <b>every</b> term you are given, not just the first two.',
      ]),
      example('Example 1', 'What is the next number: 61, 54, 47, 40, 33?', [
        'Gaps: −7, −7, −7, −7. The sequence goes down by 7 each time.',
        '33 − 7 = <b>26</b>.',
      ], '26'),
      example('Example 2', 'Find the next number in each sequence: (a) 21, 23, 26, 30, 35 (b) 14, 19, 26, 31, 38', [
        '(a) Gaps: +2, +3, +4, +5. Each gap is one more than the last, so the next gap is +6. 35 + 6 = <b>41</b>.',
        '(b) Gaps: +5, +7, +5, +7. The gaps take turns, so the next gap is +5. 38 + 5 = <b>43</b>.',
      ], '(a) 41 (b) 43'),
      example('Example 3', 'The sequence 3, 6, 12, 24, … keeps going in the same way. What is the 7th term?', [
        'Gaps: +3, +6, +12. They double, which is a sign of multiplying. Check: 6 ÷ 3 = 2, 12 ÷ 6 = 2, 24 ÷ 12 = 2. The rule is <b>multiply by 2</b>.',
        'Keep going, counting the terms: 5th term 48, 6th term 96, 7th term <b>192</b>.',
      ], '192'),
      p('Sequences can also go down by dividing. In 1,458, 486, 162, 54, … each term is the one before divided by 3, so the next term is 54 ÷ 3 = 18.'),
      example('Example 4', 'Each number in this sequence is the total of the two numbers before it. What is the missing number? 7, □, 12, 17, 29', [
        'The 3rd term is the total of the first two: 7 + □ = 12.',
        'So □ = 12 − 7 = <b>5</b>.',
        'Check the rest: 5 + 12 = 17 ✓ and 12 + 17 = 29 ✓.',
      ], '5'),
      h('A rule for any term'),
      p('When the gap is always the same, you can write a rule that gives any term straight from its position <i>n</i>. If the gap is 7, the terms go up like the 7 times table, so the rule starts with 7<i>n</i>. Then adjust it so the first term comes out right. (The same idea is used for [[seq_visual_patterns|growing patterns]].)'),
      example('Example 5', 'Find a rule for the <i>n</i>th term of 10, 17, 24, 31, … and use it to find the 20th term.', [
        'The gap is 7, so start with 7<i>n</i>. For <i>n</i> = 1 that gives 7, but the first term is 10: add 3.',
        'Rule: <b>7<i>n</i> + 3</b>. Check the 4th term: 7 × 4 + 3 = 31. ✓',
        '20th term: 7 × 20 + 3 = <b>143</b>.',
      ], '7<i>n</i> + 3; 143'),
      p('If the first term is smaller than the gap, the rule has a minus: 2, 6, 10, 14, … has gap 4, and 4 × 1 = 4 is 2 too many, so the rule is 4<i>n</i> − 2.'),
      h('Patterns in calculations'),
      p('Sometimes the sequence is a list of calculations. Look for what changes from line to line and what stays the same.'),
      example('Example 6', 'Use the pattern to work out 37 × 18.', [
        'The number being multiplied by 37 goes up in 3s, and the answer goes up in 111s: 37 × 3 = 111, so 37 × 6 is 2 lots of 111 and 37 × 9 is 3 lots.',
        '18 = 3 × 6, so 37 × 18 is 6 lots of 111.',
        '6 × 111 = <b>666</b>.',
      ], '666', { visual: { type: 'table', headers: ['Calculation', 'Answer'], rows: [['37 × 3', '111'], ['37 × 6', '222'], ['37 × 9', '333']] } }),
      mistake('counting terms wrongly when asked for "the 7th term". Write the term numbers 1st, 2nd, 3rd, … above the sequence as you go, so you stop at the right place.'),
      mistake('checking the rule on only the first gap. In 4, 1, 5, 6, 11 the first gap is −3, but the next is +4, so "subtract 3" is wrong. The rule has to fit every term.'),
      note('if the gaps grow quickly, think "multiply"; if they grow slowly and steadily (+2, +3, +4), think "gaps changing by the same amount".'),
    ].join(''),
  },
  {
    id: 'seq_repeating_patterns',
    title: 'Repeating patterns and number grids',
    skills: ['seq_repeating_patterns'],
    prereqs: ['ar_divide_remainders', 'frac_unit_fractions'],
    summary: 'Use the length of a repeating block to find what is in a far-away position, what fraction of a pattern is one colour, and where a number lands in a grid.',
    body: [
      h('The big idea'),
      p('Think of a row of lights that goes red, red, blue, green, red, red, blue, green, … The same group of four keeps coming back. That group is the <b>repeating block</b> (or <b>cycle</b>), and the number of things in it is the <b>cycle length</b>, here 4.'),
      p('Once you know the block, you never need to draw the whole row. Every question can be answered by thinking about one block.'),
      key('What is in position N?', p('Divide N by the cycle length. The <b>remainder</b> tells you how far into the block you are.') + list([
        'Remainder 1 → the 1st thing in the block, remainder 2 → the 2nd, and so on.',
        'Remainder 0 → the <b>last</b> thing in the block (a block has just finished).',
      ])),
      example('Example 1', 'Balloons are tied in the order purple, green, yellow, red, blue, over and over. What colour is the 58th balloon? What colour is the 60th?', [
        'The block has 5 colours.',
        '58 ÷ 5 = 11 remainder 3. After 11 full blocks (55 balloons) you are 3 into the next block: purple, green, <b>yellow</b>.',
        '60 ÷ 5 = 12 remainder 0. Exactly 12 blocks end at balloon 60, so it is the last colour in the block: <b>blue</b>.',
      ], 'yellow; blue'),
      h('Fractions of a repeating pattern'),
      p('If a pattern is made of whole blocks, each colour takes up the same fraction of the whole pattern as it does of one block. This is because every block is the same.'),
      display('fraction that are blue = ' + frac('blues in one block', 'cycle length')),
      example('Example 2', 'Lights are put in a line in the pattern red, red, blue, green. (a) What fraction of the lights are red? (b) If there are 28 lights, how many are red?', [
        '(a) One block has 4 lights and 2 of them are red: ' + frac(2, 4) + ', which simplifies to <b>' + frac(1, 2) + '</b>. See [[frac_compare_equivalence|simplifying fractions]].',
        '(b) 28 ÷ 4 = 7 blocks. Each block has 2 reds, so 7 × 2 = <b>14</b> red lights. (Check: ' + frac(1, 2) + ' of 28 is 14. ✓)',
      ], '(a) ' + frac(1, 2) + ' (b) 14'),
      h('Number grids'),
      p('Some questions put a sequence into a grid, filling each row from left to right before starting the next. The grid is a repeating pattern too: each row holds the same number of terms, so the column pattern repeats.'),
      steps([
        'Work out how many steps the number is after the first number: (number − first number) ÷ the gap.',
        'Divide that by how many numbers fit in a row. The answer (the quotient) is how many rows are already full.',
        'The number is in the next row. The remainder + 1 tells you how far along that row it is.',
      ]),
      example('Example 3', 'The grid keeps going in the same way. Which row and which column will 299 be in?', [
        'The numbers start at 3 and go up in 4s. 299 is (299 − 3) ÷ 4 = 296 ÷ 4 = 74 steps after 3.',
        'Each row holds 7 numbers: 74 ÷ 7 = 10 remainder 4. So 10 rows are full.',
        '299 is in row 11, and it is 4 + 1 = 5th along the row: A, B, C, D, <b>E</b>.',
      ], 'Row 11, column E', { visual: { type: 'table', headers: letters(7), rows: gridRows(3, 4, 7, 3) } }),
      p('Check with a number you can see: 27 is (27 − 3) ÷ 4 = 6 steps after 3. 6 ÷ 7 = 0 remainder 6, so row 1, 7th along, column G. ✓'),
      p('In some grids the rows <b>take turns</b>: row 1 runs left to right, row 2 right to left, and so on. Find the row and the place along it in the same way, but in an even-numbered row count the place from the <b>right</b>.'),
      example('Example 4', 'This grid has rows that take turns. Which column is 45 in?', [
        'The numbers go up in 1s from 1, so 45 is 45 − 1 = 44 steps after 1.',
        '44 ÷ 6 = 7 remainder 2. 7 rows are full, so 45 is in row 8, and it is the 3rd number along that row.',
        'Row 8 is even, so it runs right to left. Count 3 from the right: F, E, <b>D</b>.',
      ], 'Column D', { visual: { type: 'table', headers: letters(6), rows: gridRows(1, 1, 6, 3, true) } }),
      p('You can also go the other way and find which number sits in a given row and column. Count the steps from the first number to that square, then multiply by the gap.'),
      example('Example 5', 'In the grid from Example 3 (starting at 3, going up in 4s, 7 numbers in a row), which number is in row 25, column C?', [
        'Before row 25 there are 24 full rows: 24 × 7 = 168 steps.',
        'Column C is the 3rd place, which is 2 more steps: 168 + 2 = 170 steps after the first number.',
        'Each step adds 4: 3 + 170 × 4 = 3 + 680 = <b>683</b>.',
        'Check: (683 − 3) ÷ 4 = 170, and 170 ÷ 7 = 24 remainder 2, so row 25, 3rd along. ✓',
      ], '683'),
      p('In a grid whose rows take turns, remember that an even row is filled from the right. In the grid from Example 4, column B in row 8 is the 5th number along that row (F, E, D, C, B), so it is 7 × 6 + 4 = 46 steps after 1: the number 47.'),
      h('Tile patterns'),
      p('A tiled floor can repeat in two directions: across and down. To fill a gap, find how many columns pass before the pattern repeats across, and how many rows before it repeats down. Then copy the tiles from a matching place that is not hidden.'),
      example('Example 6', 'Some tiles are missing from this repeating floor. Which piece fills the gap?', [
        'Across, the pattern repeats every 3 columns: the top row goes black, white, striped, black, white, striped, … Down, it repeats every 2 rows.',
        'So the gap must look exactly like the tiles 3 columns to its left, in the same two rows.',
        'Those tiles are white, striped on top and grey, white underneath. That is piece <b>C</b>.',
      ], 'C', { visual: tileVisual }),
      mistake('using the remainder as the position when it is 0. A remainder of 0 means "the end of a block", so it is the <b>last</b> item, not the first.'),
      mistake('counting the whole blocks as the row number in a grid. If 10 rows are full, the number is in row <b>11</b>.'),
      note('test your method on a small position you can see. If the block has 5 colours, position 7 should be the 2nd colour: 7 ÷ 5 = 1 remainder 2. ✓'),
    ].join(''),
  },
  {
    id: 'seq_visual_patterns',
    title: 'Growing patterns made of shapes',
    skills: ['seq_visual_patterns'],
    prereqs: ['seq_arithmetic_geometric', 'geom_shape_names'],
    summary: 'Turn a picture pattern into a number sequence, find a rule for any term, and work out which term has a given number of shapes.',
    body: [
      h('The big idea'),
      p('In a growing pattern each picture, or <b>term</b>, has a few more shapes than the one before. Count the shapes in each term and you have a number sequence. When the same number of shapes is added each time, you can find a rule that jumps straight to any term, even term 100, without drawing them all.'),
      figure({ type: 'visual_pattern', counts: [6, 10, 14], motif: 'circle', layout: 'block' }, 'Term 1 has 6 circles, term 2 has 10 and term 3 has 14. Each term adds 4.'),
      key('The rule for term n', p('If each term adds the same number <i>d</i>:') + display('shapes in term <i>n</i> = <i>d</i> × <i>n</i> + (term 1 − <i>d</i>)') + p('For the circles: <i>d</i> = 4 and term 1 − 4 = 6 − 4 = 2, so term <i>n</i> has <b>4<i>n</i> + 2</b> circles.')),
      h('Why it works'),
      p('Imagine going back one step before term 1. Taking 4 away from 6 leaves 2: call this "term 0". Every term is term 0 with some lots of 4 added. Term 1 has 1 lot of 4 added, term 2 has 2 lots, so term <i>n</i> has <i>n</i> lots: 4 × <i>n</i> + 2. Check: term 3 is 4 × 3 + 2 = 14. ✓'),
      h('Method'),
      steps([
        'Count the shapes in each term you are shown and write the numbers as a sequence.',
        'Find the gap <i>d</i> between terms. Check it is the same every time.',
        'Find "term 0" by taking <i>d</i> away from term 1.',
        'Rule: term <i>n</i> = <i>d</i> × <i>n</i> + term 0. If term 0 is below zero, the rule takes away instead of adding (see Example 4).',
      ]),
      example('Example 1', 'Using the circle pattern above, how many circles are in term 5?', [
        'For a nearby term, just keep adding 4: term 4 has 14 + 4 = 18, term 5 has 18 + 4 = <b>22</b>.',
        'Check with the rule: 4 × 5 + 2 = 22. ✓',
      ], '22 circles'),
      example('Example 2', 'How many circles are in term 20?', [
        'Counting on 17 more times is slow, so use the rule 4<i>n</i> + 2.',
        '4 × 20 + 2 = 80 + 2 = <b>82</b>.',
      ], '82 circles'),
      example('Example 3', 'One term of the circle pattern has 50 circles. Which term is it?', [
        'Work backwards through the rule. Take away term 0: 50 − 2 = 48.',
        'Divide by the gap: 48 ÷ 4 = <b>12</b>.',
        'Check: 4 × 12 + 2 = 50. ✓',
      ], 'Term 12'),
      example('Example 4', 'Which expression gives the number of squares in term <i>n</i>?', [
        'The counts are 3, 8, 13. The gap is 5 each time, so <i>d</i> = 5.',
        'Going back one step from term 1 means 3 − 5, which goes 2 below zero (−2). So term 0 is −2 and the rule takes 2 away.',
        'Term <i>n</i> has <b>5<i>n</i> − 2</b> squares. Check term 2: 5 × 2 − 2 = 8. ✓',
      ], '5<i>n</i> − 2', { visual: { type: 'visual_pattern', counts: [3, 8, 13], motif: 'square', layout: 'row' } }),
      p('Writing a rule with a letter like <i>n</i> is the start of [[alg_expressions_from_words|algebra]]: 5<i>n</i> means 5 × <i>n</i>.'),
      mistake('multiplying the term number by term 1. Term 20 of the circle pattern is not 20 × 6 = 120, because each term adds 4, not 6.'),
      mistake('forgetting the extra shapes. 4<i>n</i> alone gives 4, 8, 12, … which is 2 short of every term. Always test your rule on term 1 and term 2.'),
      note('the number in front of <i>n</i> is always the gap between terms. If a pattern adds 3 shapes each time, the rule starts 3<i>n</i>.'),
    ].join(''),
  },
  {
    id: 'seq_recurrence',
    title: 'Following a rule from one term to the next',
    skills: ['seq_recurrence'],
    prereqs: ['seq_arithmetic_geometric', 'ar_multi_step_numeric'],
    summary: 'Use a rule like "double and add 5" to build a sequence, and work backwards to find an earlier term.',
    body: [
      h('The big idea'),
      p('Some questions tell you the rule instead of asking you to find it. A <b>term-to-term rule</b> says how to make each new term from the one before, such as "add 9" or "double the last term and add 5". You start with the first term and apply the rule again and again, like feeding each answer back into a machine.'),
      figure({ type: 'function_machine', input: 3, operations: ['× 2', '+ 5'], output: 11 }, 'The rule "double and add 5" turns 3 into 11. Then 11 goes back in to make the next term.'),
      key('Using a rule', list([
        '<b>Forwards:</b> apply the rule to the term you have to get the next one. Do the steps of the rule in the order they are written.',
        '<b>Backwards:</b> undo the rule. Do the opposite steps in the opposite order: for "× 3 then + 2", first − 2, then ÷ 3.',
      ])),
      example('Example 1', 'The first term of a sequence is 4. The rule is "add 9". What is the 5th term?', [
        'Apply the rule one term at a time: 4, 13, 22, 31, 40.',
        'The 5th term is <b>40</b>.',
        'Quicker: from the 1st term to the 5th there are only 4 steps, so 4 + 4 × 9 = 40.',
      ], '40'),
      example('Example 2', 'The first term is 3. The rule is "double the last term and add 5". What is the 5th term?', [
        '2nd term: 3 × 2 + 5 = 6 + 5 = 11.',
        '3rd term: 11 × 2 + 5 = 22 + 5 = 27.',
        '4th term: 27 × 2 + 5 = 54 + 5 = 59.',
        '5th term: 59 × 2 + 5 = 118 + 5 = <b>123</b>.',
      ], '123'),
      h('Working backwards'),
      p('If you know a later term and want an earlier one, run the machine in reverse using [[ar_inverse_operations|inverse operations]]: adding is undone by subtracting, multiplying by dividing.'),
      example('Example 3', 'To get each term, multiply the term before by 3 and add 2. The 5th term is 179. What is the 3rd term?', [
        'Undo "add 2" first, then undo "multiply by 3".',
        '4th term: 179 − 2 = 177, and 177 ÷ 3 = 59.',
        '3rd term: 59 − 2 = 57, and 57 ÷ 3 = <b>19</b>.',
        'Check forwards: 19 × 3 + 2 = 59, and 59 × 3 + 2 = 179. ✓',
      ], '19'),
      mistake('doing the steps of a two-step rule in the wrong order. "Double and add 5" on 11 is 11 × 2 + 5 = 27, but "add 5 and double" would give (11 + 5) × 2 = 32.'),
      mistake('undoing in the same order. To reverse "× 3 then + 2" you must take away 2 <b>before</b> dividing by 3. 179 ÷ 3 does not even divide exactly, which is a clue that something has gone wrong.'),
      note('count the steps, not the terms. Going from the 1st term to the 5th term uses the rule 4 times, not 5.'),
    ].join(''),
  },
];
