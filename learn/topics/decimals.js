// Learn pages for decimals. See docs/LEARN_GUIDELINES.md.
import { h, p, list, steps, key, display, note, mistake, frac, figure, written, tbl, example } from '../kit.js';
import { addWork, subtractWork, multiplyWork, divideWork } from '../../generators/working.js';

const PV_HEAD = ['', 'Th', 'H', 'T', 'O', '.', 't', 'h', 'th'];

// A 10 by 10 grid with the first `count` squares shaded, row by row.
const hundredGrid = (count) => ({
  type: 'grid', rows: 10, cols: 10,
  shaded: Array.from({ length: count }, (_, i) => [Math.floor(i / 10), i % 10]),
});

export const pages = [
  {
    id: 'dec_scale_powers_ten',
    title: 'Multiplying and dividing by 10, 100 and 1,000',
    skills: ['dec_scale_powers_ten'],
    prereqs: ['np_digit_place_value'],
    summary: 'Multiply and divide whole numbers and decimals by 10, 100 and 1,000, and find the missing number in calculations like 6.31 × □ = 6,310.',
    body: [
      h('The big idea'),
      p('Each place in a number is worth 10 times the place to its right: 10 ones make a ten, 10 tenths make a one, and so on. So when you multiply by 10, every digit becomes worth 10 times as much and moves <b>one place to the left</b>. The decimal point stays where it is; the digits move past it.'),
      p('Here is 7.37 being multiplied by 10, then 100, then 1,000 (Th = thousands, H = hundreds, T = tens, O = ones, t = tenths, h = hundredths, th = thousandths):'),
      tbl([
        PV_HEAD,
        ['7.37', '', '', '', '7', '.', '3', '7', ''],
        ['× 10 = 73.7', '', '', '7', '3', '.', '7', '', ''],
        ['× 100 = 737', '', '7', '3', '7', '.', '', '', ''],
        ['× 1,000 = 7,370', '7', '3', '7', '<b>0</b>', '.', '', '', ''],
      ]),
      p('In the last row the ones column is empty, so a <b>0</b> goes there to hold the other digits in their places. A zero used like this is called a <b>placeholder</b>.'),
      key('Moving digits', list([
        '× 10: digits move 1 place left. &nbsp; × 100: 2 places. &nbsp; × 1,000: 3 places.',
        '÷ 10: digits move 1 place right. &nbsp; ÷ 100: 2 places. &nbsp; ÷ 1,000: 3 places.',
      ]) + p('The number of zeros in 10, 100 or 1,000 tells you how many places to move.')),
      h('Dividing'),
      p('Dividing moves the digits to the right, so the number gets smaller. If there is nothing left in the ones column, write 0 there.'),
      tbl([
        PV_HEAD,
        ['53.1', '', '', '5', '3', '.', '1', '', ''],
        ['÷ 100 = 0.531', '', '', '', '<b>0</b>', '.', '5', '3', '1'],
      ]),
      example('Example 1', 'Work out 67 ÷ 100.', [
        'Dividing by 100 moves the digits 2 places to the right.',
        'The 6 tens become 6 tenths and the 7 ones become 7 hundredths: <b>0.67</b>.',
      ], '0.67'),
      example('Example 2', 'A marble weighs 924 g. What do 10 marbles weigh?', [
        '924 × 10: the digits move 1 place left and a placeholder 0 fills the ones.',
      ], '9,240 g'),
      example('Example 3', 'A wire 53.1 m long is cut into 100 equal pieces. How long is each piece?', [
        'Cutting into 100 equal pieces means dividing by 100: 53.1 ÷ 100.',
        'The digits move 2 places right: <b>0.531</b>.',
      ], '0.531 m'),
      h('Finding the missing number'),
      p('For questions like 6.31 × □ = 6,310, compare where the same digits sit before and after.'),
      example('Example 4', '6.31 × □ = 6,310. What number goes in the box?', [
        'The 6 starts in the ones place and ends in the thousands place.',
        'That is 3 places to the left, so the box is the number with 3 zeros.',
      ], '1,000'),
      example('Example 5', '57.1 ÷ □ = 0.571. What number goes in the box?', [
        'The 5 starts in the tens place and ends in the tenths place.',
        'Tens → ones → tenths is 2 places to the right, so the number got smaller by dividing by <b>100</b>.',
        'Check: 57.1 ÷ 100 = 0.571. ✓',
      ], '100'),
      mistake('"adding a zero" to multiply by 10. That only works for whole numbers. 7.37 × 10 is <b>not</b> 7.370 (that is still 7.37). Move the digits instead: 73.7.'),
      note('check the size. Multiplying by 10, 100 or 1,000 must make the number bigger, and dividing must make it smaller. If 53.1 ÷ 100 came out as 5,310, you moved the wrong way.'),
    ].join(''),
  },
  {
    id: 'dec_add_subtract',
    title: 'Adding and subtracting decimals',
    skills: ['dec_add_subtract'],
    prereqs: ['np_digit_place_value', 'ar_add_subtract_word'],
    summary: 'Add and subtract decimals, such as lengths, masses and money, by lining up the decimal points.',
    body: [
      h('The big idea'),
      p('Adding decimals works just like adding whole numbers, as long as you only add digits that are worth the same: tenths to tenths, hundredths to hundredths. The way to make sure of this is to <b>line up the decimal points</b>.'),
      key('Adding and subtracting decimals', steps([
        'Write the numbers in columns with the decimal points underneath each other.',
        'If one number has fewer decimal places, fill the gaps with zeros. 2.9 is the same as 2.90.',
        'Add or subtract as usual, starting from the right. Put the decimal point in the answer in line with the others.',
      ])),
      example('Example 1', 'A ribbon is made by joining pieces of 4.71 m and 0.36 m. How long is it altogether?', [
        'Line up the points and add from the right:' + written(addWork(4.71, 0.36)),
        '1 + 6 = 7 hundredths. 7 + 3 = 10 tenths, which is 1 one and 0 tenths, so carry the 1.',
      ], '5.07 m'),
      example('Example 2', 'Two parcels weigh 2.9 kg and 11.48 kg. What is their total mass?', [
        '2.9 has only one decimal place, so write it as 2.90.',
        'Add:' + written(addWork(2.9, 11.48)),
      ], '14.38 kg'),
      example('Example 3', 'A tank held 8.72 litres. Then 0.4 litres leaked out. How much is left?', [
        'Write 0.4 as 0.40 so that the 4 tenths sits under the 7 tenths.',
        '8.72 − 0.40: 2 − 0 = 2 hundredths, 7 − 4 = 3 tenths, 8 − 0 = 8 ones.',
      ], '8.32 litres'),
      example('Example 4', 'Maya pays for a £3.47 book with a £10 note. How much change does she get?', [
        'Write £10 as £10.00 so that it has the same number of decimal places as £3.47.',
        'Subtract, exchanging across the zeros:' + written(subtractWork(10, 3.47)),
        'Check by adding back: £6.53 + £3.47 = £10.00. ✓',
      ], '£6.53'),
      mistake('lining up the right-hand ends instead of the points. For 4.2 + 0.25, putting the 2 of 4.2 above the 5 gives the wrong answer. Write 4.20 + 0.25 = 4.45.'),
      mistake('forgetting to carry when the tenths add up to 10 or more. 0.7 + 0.5 is 1.2, not 0.12.'),
      note('estimate first by rounding to whole numbers. 2.9 + 11.48 is about 3 + 11 = 14, so 14.38 is sensible. For money and shopping questions, see also [[meas_money_shopping]].'),
    ].join(''),
  },
  {
    id: 'dec_multiplication',
    title: 'Multiplying decimals',
    skills: ['dec_multiplication'],
    prereqs: ['dec_scale_powers_ten', 'ar_multiplication_context'],
    summary: 'Multiply a decimal by a whole number or by another decimal, and use a known fact like 35 × 12 = 420 to find 0.35 × 1.2.',
    body: [
      h('The big idea'),
      p('A tile is 1.8 m long. How long is a row of 4 tiles? 1.8 is 18 tenths, and 18 tenths × 4 = 72 tenths, which is 7.2. So you can multiply decimals by forgetting the decimal point, multiplying whole numbers, then putting the point back.'),
      key('Multiplying decimals', steps([
        'Ignore the decimal points and multiply the whole numbers.',
        'Count the <b>decimal places</b> (digits after the point) in <b>both</b> numbers in the question, all together.',
        'Give the answer that many decimal places.',
      ]) + display('0.2 × 0.9: &nbsp; 2 × 9 = 18, &nbsp; 1 + 1 = 2 decimal places, &nbsp; so 0.18')),
      h('Why it works'),
      p('0.2 is 2 ÷ 10 and 0.9 is 9 ÷ 10. Multiplying them gives 2 × 9 = 18, divided by 10 and by 10 again, which is 18 ÷ 100 = 0.18. You can see it on a square split into 100 small squares:'),
      figure({ type: 'grid', rows: 10, cols: 10, shaded: Array.from({ length: 18 }, (_, i) => [Math.floor(i / 9), i % 9]) }, 'The whole square is 1 by 1. A strip 0.2 tall (2 rows) and 0.9 wide (9 columns) covers 18 of the 100 small squares: 0.2 × 0.9 = 0.18.'),
      example('Example 1', 'One tile is 1.8 m long. How long is a row of 4 tiles?', [
        'Work out 18 × 4:' + written(multiplyWork(1.8, 4)),
        '1.8 has one decimal place, so the answer has one too.',
      ], '7.2 m'),
      example('Example 2', 'What is 0.4 × 0.5?', [
        '4 × 5 = 20.',
        'Two decimal places altogether, so 0.20.',
        '0.20 is the same as <b>0.2</b>. Count the places <b>before</b> you drop the end zero.',
      ], '0.2'),
      example('Example 3', 'Work out 2.4 × 1.3.', [
        'Multiply 24 × 13:' + written(multiplyWork(2.4, 1.3)),
        '2.4 and 1.3 each have one decimal place, so the answer has two: 312 → <b>3.12</b>.',
        'Check: 2.4 × 1 = 2.4 and 2.4 × 1.5 = 3.6, so the answer must be between them. 3.12 is. ✓',
      ], '3.12'),
      h('Using a fact you are given'),
      p('Some questions give you a whole-number fact. Do not multiply again: just count decimal places.'),
      example('Example 4', 'Use 39 × 13 = 507 to find 0.39 × 1.3.', [
        '0.39 has 2 decimal places and 1.3 has 1, so the answer has 3.',
        '507 with 3 decimal places is <b>0.507</b>.',
        'Check: 0.39 is about 0.4, and 0.4 × 1.3 is a bit over 0.5. ✓',
      ], '0.507'),
      mistake('thinking that multiplying always makes a number bigger. Multiplying by a number less than 1 makes it smaller: 0.2 × 0.9 = 0.18 is smaller than both. An answer of 1.8 would be ten times too big.'),
      note('when you multiply by 10, 100 or 1,000 you do not need this method: just move the digits (see [[dec_scale_powers_ten]]).'),
    ].join(''),
  },
  {
    id: 'dec_fraction_percent_conversion',
    title: 'Fractions, decimals and percentages',
    skills: ['dec_fraction_percent_conversion'],
    prereqs: ['frac_compare_equivalence', 'dec_scale_powers_ten'],
    summary: 'Change between fractions, decimals and percentages, and spot which ones are equal.',
    body: [
      h('The big idea'),
      p('Fractions, decimals and percentages are three ways of writing the same amount. <b>Per cent</b> means "out of 100", so 35% means 35 out of 100. Look at this square of 100 small squares:'),
      figure(hundredGrid(35), '35 out of 100 squares are shaded.'),
      display(`${frac(35, 100)} = 0.35 = 35%`),
      p('You can also simplify ' + frac(35, 100) + ' by dividing top and bottom by 5 to get ' + frac(7, 20) + ', so ' + frac(7, 20) + ' is another way to write the same amount.'),
      key('Changing between them', list([
        '<b>Decimal to percentage:</b> multiply by 100. 0.35 → 35%, &nbsp; 0.6 → 60%, &nbsp; 0.175 → 17.5%.',
        '<b>Percentage to decimal:</b> divide by 100. 8% → 0.08.',
        '<b>Fraction to decimal:</b> make the bottom 10, 100 or 1,000 using [[frac_compare_equivalence|equivalent fractions]]. If you cannot, divide the top by the bottom.',
        '<b>Decimal to fraction:</b> write it over 10, 100 or 1,000 (one zero for each decimal place), then simplify.',
      ])),
      p('These come up all the time, so learn them:'),
      tbl([
        ['Fraction', frac(1, 2), frac(1, 4), frac(3, 4), frac(1, 5), frac(1, 10), frac(1, 8), frac(1, 20), frac(1, 100)],
        ['Decimal', '0.5', '0.25', '0.75', '0.2', '0.1', '0.125', '0.05', '0.01'],
        ['Percentage', '50%', '25%', '75%', '20%', '10%', '12.5%', '5%', '1%'],
      ]),
      example('Example 1', 'Write ' + frac(3, 5) + ' as a decimal and as a percentage.', [
        'Multiply top and bottom by 2 to make the bottom 10: ' + frac(3, 5) + ' = ' + frac(6, 10) + '.',
        frac(6, 10) + ' is 6 tenths: 0.6.',
        '0.6 × 100 = <b>60%</b>.',
      ], '0.6 and 60%'),
      example('Example 2', 'What is 0.28 as a fraction in its simplest form?', [
        '0.28 has two decimal places, so it is 28 hundredths: ' + frac(28, 100) + '.',
        'Divide top and bottom by 4: ' + frac(28, 100) + ' = ' + frac(7, 25) + '.',
      ], frac(7, 25)),
      example('Example 3', 'Write ' + frac(7, 40) + ' as a decimal and as a percentage.', [
        '40 does not go into 100, but it goes into 1,000: 40 × 25 = 1,000.',
        'Multiply top and bottom by 25: ' + frac(7, 40) + ' = ' + frac(175, 1000) + ' = 0.175.',
        '0.175 × 100 = <b>17.5%</b>.',
      ], '0.175 and 17.5%'),
      example('Example 4', 'Write ' + frac(3, 8) + ' as a decimal.', [
        'A fraction means top ÷ bottom, so work out 3 ÷ 8. Write 3 as 3.000 and use short division:' + written(divideWork(3, 8)),
        'As a percentage this is 37.5%.',
      ], '0.375'),
      example('Example 5', 'Which of these is NOT equal to ' + frac(7, 20) + '? &nbsp; 0.35, &nbsp; 35%, &nbsp; ' + frac(14, 40) + ', &nbsp; 7.20', [
        frac(7, 20) + ' = ' + frac(35, 100) + ' = 0.35 = 35%.',
        frac(14, 40) + ' simplifies to ' + frac(7, 20) + ' (divide by 2).',
        '7.20 is more than 7, but ' + frac(7, 20) + ' is less than 1.',
      ], '7.20'),
      mistake('turning the digits of a fraction straight into a decimal. ' + frac(3, 5) + ' is not 3.5 or 35%, and ' + frac(7, 40) + ' is not 7.40 or 740%. A fraction less than 1 is a decimal less than 1 and a percentage less than 100%.'),
      mistake('mixing up 0.5% and 50%. 0.5 = 50%, but 0.5% is only half of one per cent, which is 0.005.'),
      note('to compare a mix of fractions, decimals and percentages, change them all into decimals (or all into percentages) first.'),
    ].join(''),
  },
];
