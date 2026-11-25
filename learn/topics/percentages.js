// Learn pages for percentages. See docs/LEARN_GUIDELINES.md.
import { h, p, list, steps, key, display, note, mistake, frac, figure, tbl, example } from '../kit.js';

const bar = (parts, shaded, extra = {}) => ({ parts, shaded, ...extra });
const same = (count, label) => Array(count).fill(label);

export const pages = [
  {
    id: 'pct_percent_of_amount',
    title: 'Finding a percentage of an amount',
    skills: ['pct_percent_of_amount'],
    prereqs: ['frac_of_amount', 'dec_fraction_percent_conversion'],
    summary: 'Work out percentages of numbers, money and measures, and say what percentage one amount is of another.',
    body: [
      h('The big idea'),
      p('<b>Per cent</b> means "out of 100", so 1% of something is ' + frac(1, 100) + ' of it and 100% is all of it. You rarely need to split things into 100 pieces, though. Almost every percentage can be built from a few easy ones.'),
      key('Building blocks', list([
        '<b>50%</b> = half: divide by 2.',
        '<b>25%</b> = a quarter: divide by 4.',
        '<b>10%</b> = a tenth: divide by 10.',
        '<b>5%</b> = half of 10%.',
        '<b>1%</b> = divide by 100.',
      ]) + p('Then build the percentage you want: 30% = 3 × 10%, &nbsp; 15% = 10% + 5%, &nbsp; 75% = 50% + 25%, &nbsp; 95% = 100% − 5%.')),
      figure({ type: 'bar_model', bars: [bar(10, 6, { total: '£40 = 100%', labels: same(10, '£4') })] }, 'Split £40 into ten equal parts of 10%. Each is £4, so 60% (six parts) is £24.'),
      example('Example 1', 'Work out 25% of 80.', [
        '25% is a quarter, so divide by 4: 80 ÷ 4 = <b>20</b>.',
      ], '20'),
      example('Example 2', 'What is 60% of 40?', [
        '10% of 40 is 40 ÷ 10 = 4.',
        '60% is six lots of 10%: 6 × 4 = <b>24</b>.',
      ], '24'),
      example('Example 3', 'Find 85% of £24.', [
        '10% of £24 is £2.40, so 5% is half of that: £1.20.',
        '85% is 100% − 15%. And 15% = 10% + 5% = £2.40 + £1.20 = £3.60.',
        '£24 − £3.60 = <b>£20.40</b>.',
        'Check another way: 50% + 25% + 10% = £12 + £6 + £2.40 = £20.40. ✓',
      ], '£20.40'),
      h('Read the question to the end'),
      p('Word problems often ask about the part that is <b>left</b>, <b>not</b> chosen or <b>still to do</b>. Work out that percentage first: it is often easier.'),
      example('Example 4', 'Aisha is reading a 220-page book and has read 95% of it. How many pages are still to read?', [
        'Still to read: 100% − 95% = 5%.',
        '10% of 220 is 22, so 5% is half of that: <b>11</b>.',
      ], '11 pages'),
      h('What percentage is one amount of another?'),
      p('Write the two amounts as a fraction, part over whole, in the <b>same units</b>. Then change the fraction to a percentage, usually by making the bottom 100 (see [[dec_fraction_percent_conversion]]).'),
      example('Example 5', 'A walk is 4 km long. After the first 1,400 m, what percentage of the walk is finished?', [
        'Use the same units: 4 km = 4,000 m.',
        'Fraction finished: ' + frac('1,400', '4,000') + '. Divide top and bottom by 40: ' + frac(35, 100) + '.',
        frac(35, 100) + ' = <b>35%</b>.',
      ], '35%'),
      h('Comparing different kinds of calculation'),
      p('Some questions mix fractions, percentages and decimals, such as "Which is largest?". Work each one out as a number, then compare. Remember that × 0.2 is the same as finding 20%, or ' + frac(1, 5) + '.'),
      example('Example 6', 'Which gives the largest answer? &nbsp; ' + frac(1, 5) + ' of 225, &nbsp; 25% of 168, &nbsp; 0.2 × 175, &nbsp; 10% of 400', [
        frac(1, 5) + ' of 225 = 225 ÷ 5 = 45.',
        '25% of 168 = 168 ÷ 4 = 42.',
        '0.2 × 175 is ' + frac(1, 5) + ' of 175 = 35.',
        '10% of 400 = 40.',
      ], frac(1, 5) + ' of 225'),
      mistake('using different units. 60p out of £2 is not 60 ÷ 2. Change £2 to 200p first: ' + frac(60, 200) + ' = ' + frac(30, 100) + ' = 30%.'),
      note('a percentage less than 100% always gives less than the whole amount. If 85% of £24 came out bigger than £24, check again.'),
    ].join(''),
  },
  {
    id: 'pct_discount_sale_price',
    title: 'Discounts and sale prices',
    skills: ['pct_discount_sale_price'],
    prereqs: ['pct_percent_of_amount', 'meas_money_shopping'],
    summary: 'Find the price after a percentage discount, including two discounts one after the other.',
    body: [
      h('The big idea'),
      p('In a sale, a shop takes a percentage off the price. The amount taken off is the <b>discount</b>. What you pay is the <b>sale price</b>.'),
      figure({ type: 'bar_model', bars: [bar(5, 4, { total: '£60', labels: ['£12', '£12', '£12', '£12', '£12 off'] })] }, '20% is one fifth. One fifth of £60 (£12) comes off, and you pay the shaded four fifths: £48.'),
      key('Sale price', p('<b>Sale price = original price − discount</b>') + p('Or, in one step: with 20% off you pay 100% − 20% = 80% of the price.')),
      steps([
        'Find the discount: the percentage of the original price (see [[pct_percent_of_amount]]).',
        'Take it away from the original price.',
      ]),
      example('Example 1', 'A £60 football shirt has 20% off. How much do you pay?', [
        '10% of £60 is £6, so 20% is £12.',
        '£60 − £12 = <b>£48</b>.',
        'Or in one step: 80% of £60 = 8 × £6 = £48.',
      ], '£48'),
      example('Example 2', 'A scooter costs £36. In a sale it is reduced by 15%. What is the sale price?', [
        '10% of £36 is £3.60 and 5% is £1.80. So 15% is £3.60 + £1.80 = £5.40.',
        '£36 − £5.40: take £5 to get £31, then 40p more to get <b>£30.60</b>.',
      ], '£30.60'),
      h('Two discounts, one after the other'),
      p('Sometimes a price is reduced, and then the <b>new</b> price is reduced again. The second percentage is of the reduced price, not of the original, so work one step at a time.'),
      example('Example 3', 'A guitar costs £80. It is reduced by 30%, and then the new price is reduced by 10%. What is the final price?', [
        'First discount: 30% of £80 is 3 × £8 = £24, so the price becomes £80 − £24 = £56.',
        'Second discount: 10% of £56 is £5.60, so the price becomes £56 − £5.60 = <b>£50.40</b>.',
      ], '£50.40'),
      example('Example 4', 'A £150 shirt is on sale in two shops. Shop A takes 30% off. Shop B takes 20% off and then 10% off that price. How much cheaper is shop A?', [
        'Shop A: 30% of £150 is £45, so you pay £150 − £45 = £105.',
        'Shop B: 20% of £150 is £30, which leaves £120. Then 10% of £120 is £12, which leaves £108.',
        '£108 − £105 = <b>£3</b>.',
      ], '£3'),
      mistake('adding the two percentages. 20% off and then 10% off is <b>not</b> the same as 30% off, because the second 10% is taken from a smaller price. Example 4 shows the difference.'),
      mistake('giving the discount when the question asks for the price you pay (or the other way round). Read the last sentence again before you answer.'),
      note('check by adding: sale price + discount should equal the original price. £48 + £12 = £60. ✓ To go backwards from a sale price, see [[pct_reverse_percentage]].'),
    ].join(''),
  },
  {
    id: 'pct_reverse_percentage',
    title: 'Finding the original price',
    skills: ['pct_reverse_percentage'],
    prereqs: ['pct_percent_of_amount', 'pct_discount_sale_price'],
    summary: 'Work backwards from a price after a percentage decrease or increase to find what it cost before.',
    body: [
      h('The big idea'),
      p('"With 20% off, a sleeping bag costs £80. What was the original price?" Here you know the price <b>after</b> the change and need the price before. The key is to ask: what percentage of the original is £80?'),
      p('With 20% off you pay 80% of the original. So £80 is 80% of the original price, not 100%.'),
      figure({ type: 'bar_model', bars: [bar(5, 4, { total: '? = 100%', labels: ['£20', '£20', '£20', '£20', '20% off'] })] }, 'The £80 you pay is the 4 shaded parts out of 5 (80%), so each part (20%) is £20 and the whole is 5 × £20 = £100.'),
      key('Working backwards', steps([
        'Work out what percentage of the original the new price is. After 20% off it is 80%. After a 10% rise it is 110%.',
        'Divide to find 10% (or another easy part, such as 5% or 1%).',
        'Multiply up to 100%.',
      ])),
      example('Example 1', 'After a 10% discount, a bookcase costs £126. What was the original price?', [
        'With 10% off you pay 90%, so £126 is 90% of the original.',
        '90% is nine lots of 10%, so 10% is £126 ÷ 9 = £14.',
        '100% is 10 × £14 = <b>£140</b>.',
        'Check: 10% of £140 is £14, and £140 − £14 = £126. ✓',
      ], '£140'),
      example('Example 2', 'The price of a games console goes up by 10% to £132. What was the price before?', [
        'After a 10% rise the price is 100% + 10% = 110% of the old price.',
        '110% is eleven lots of 10%, so 10% is £132 ÷ 11 = £12.',
        '100% is 10 × £12 = <b>£120</b>.',
      ], '£120'),
      example('Example 3', 'A train ticket goes up by 25% to £50. What did it cost before?', [
        'After a 25% rise the price is 125% of the old price, so £50 is 125%.',
        '125% is five lots of 25%, so 25% is £50 ÷ 5 = £10.',
        '100% is four lots of 25%: 4 × £10 = <b>£40</b>.',
        'Check: 25% of £40 is £10, and £40 + £10 = £50. ✓',
      ], '£40'),
      example('Example 4', 'A shop reduces a bookcase by 15%. It now costs £119. How much was it before the sale?', [
        'You pay 100% − 15% = 85%, so £119 is 85% of the old price.',
        '85% does not split into tens, but it is 17 lots of 5%. £119 ÷ 17 = £7, so 5% is £7.',
        '100% is 20 lots of 5%: 20 × £7 = <b>£140</b>.',
      ], '£140'),
      example('Example 5', 'A shop cuts the price of a sleeping bag by 30% to £56. By how many pounds was the price cut?', [
        '£56 is 70% of the old price, so 10% is £56 ÷ 7 = £8.',
        'The cut was 30%, which is 3 × £8 = <b>£24</b>.',
        '(The old price was 10 × £8 = £80, and £80 − £56 = £24. ✓)',
      ], '£24'),
      mistake('finding the percentage of the new price and adding it on. For "20% off makes £80", 20% of £80 is £16 and £80 + £16 = £96, which is wrong. The 20% was taken from the <b>original</b> price, not from £80. Check: 20% of £96 is £19.20, and £96 − £19.20 is not £80.'),
      note('always check by going forwards from your answer. Starting from £100, 20% off gives £100 − £20 = £80. ✓'),
    ].join(''),
  },
  {
    id: 'pct_percentage_composition',
    title: 'Percentages of a group that changes',
    skills: ['pct_percentage_composition'],
    prereqs: ['pct_percent_of_amount', 'ar_add_subtract_word'],
    summary: 'Find what percentage of a group has some property after people join or leave.',
    body: [
      h('The big idea'),
      p('A drama group has 48 pupils, and 18 of them are in Year 6. Then 8 of the Year 6 pupils leave. What percentage of the group are now in Year 6?'),
      p('When people join or leave, two numbers can change: the number with the property (the Year 6 pupils), and the <b>total</b> size of the group. You need both new numbers before you work out the percentage.'),
      key('Percentage of a group', display('percentage = ' + frac('number with the property', 'total in the group') + ' as a percentage') + p('Use the numbers <b>after</b> the changes, for the top and for the bottom.')),
      steps([
        'Work out the new number with the property.',
        'Work out the new total. Anyone who joins or leaves changes the total, whatever group they are in.',
        'Write the fraction new number ÷ new total, simplify it, and change it to a percentage (see [[dec_fraction_percent_conversion]]).',
      ]),
      example('Example 1', 'A drama group has 48 pupils, and 18 are in Year 6. Then 8 of the Year 6 pupils leave. What percentage of the group are in Year 6 now?', [
        'Year 6 pupils: 18 − 8 = 10.',
        'The 8 who left were also part of the group, so the total is 48 − 8 = 40.',
        'Fraction: ' + frac(10, 40) + ' = ' + frac(1, 4) + ' = <b>25%</b>.',
      ], '25%', { visual: { type: 'bar_model', bars: [bar(4, 1, { total: '40 pupils', labels: ['10 in Y6', '10', '10', '10'] })] } }),
      example('Example 2', 'Of the 18 runners in a club, 3 are under 12. Then 2 more under-12s join. What percentage are under 12 now?', [
        'Under-12s: 3 + 2 = 5. Total: 18 + 2 = 20.',
        frac(5, 20) + ' = ' + frac(25, 100) + ' = <b>25%</b>.',
      ], '25%'),
      example('Example 3', 'There are 58 pupils in a drama group, including 18 in Year 6. Then 6 Year 6 pupils leave, and 8 new members who are not in Year 6 join. What percentage are in Year 6 now?', [
        'Year 6 pupils: 18 − 6 = 12. (The new members are not in Year 6, so they do not change this.)',
        'Total: 58 − 6 + 8 = 60.',
        frac(12, 60) + ' = ' + frac(1, 5) + ' = <b>20%</b>.',
      ], '20%'),
      mistake('changing only one number. In Example 1, using the old total gives ' + frac(10, 48) + ', which is wrong: the 8 who left are no longer in the group.'),
      mistake('forgetting newcomers who do not have the property. In Example 3 the 8 new members are not in Year 6, but they still make the group bigger.'),
      note('simplify first and look for a fraction you know: ' + frac(1, 5) + ' = 20%, ' + frac(1, 4) + ' = 25%, ' + frac(3, 10) + ' = 30%, ' + frac(2, 5) + ' = 40%, ' + frac(3, 5) + ' = 60%, ' + frac(3, 4) + ' = 75%.'),
    ].join(''),
  },
  {
    id: 'pct_percent_change_scaling',
    title: 'Percentage changes and area',
    skills: ['pct_percent_change_scaling'],
    prereqs: ['pct_percent_of_amount', 'geom_area_scaling'],
    summary: 'Work out how the area of a rectangle or square changes when its length and width change by percentages.',
    body: [
      h('The big idea'),
      p('The area of a rectangle is length × width (see [[geom_area_basic]]). If only the length gets 25% bigger, the area gets 25% bigger too. But if <b>both</b> sides change, the changes multiply together, and the answer is often a surprise.'),
      p('Look at a square with sides of 2. Make each side 50% longer, so it becomes 3. The area goes from 2 × 2 = 4 to 3 × 3 = 9.'),
      figure({ type: 'grid', rows: 3, cols: 3, shaded: [[0, 0], [0, 1], [1, 0], [1, 1]], sideLabels: { top: '3', left: '3' } }, 'The shaded 2 by 2 square (area 4) grows to 3 by 3 (area 9). The area has grown by 5, which is more than the 4 it started with.'),
      p('The increase is 5 out of the starting 4: ' + frac(5, 4) + ' = 125%. Making each side 50% longer makes the area <b>125%</b> bigger, not 50%.'),
      key('The easy method', steps([
        'Choose a starting size that is easy to work with. For a rectangle use 10 by 10, so the area is 100.',
        'Apply each percentage change to its side.',
        'Work out the new area. Because the old area was 100, the change in area is the percentage change.',
      ])),
      p('This works for any rectangle, because the percentage change in area depends only on the percentage changes in the sides.'),
      example('Example 1', 'A rectangle is 10 cm long and 6 cm wide. Its length is increased by 25% and the width stays the same. By what percentage does the area increase?', [
        'Old area: 10 × 6 = 60 cm².',
        'New length: 25% of 10 is 2.5, so 12.5 cm. New area: 12.5 × 6 = 75 cm².',
        'Increase: 75 − 60 = 15. As a fraction of the old area: ' + frac(15, 60) + ' = ' + frac(1, 4) + ' = <b>25%</b>.',
      ], '25%'),
      example('Example 2', 'The length of a rectangle goes up by 50% and its width goes down by 20%. What is the percentage change in its area?', [
        'Start with 10 by 10, area 100.',
        'Length: 10 + 50% of 10 = 15. Width: 10 − 20% of 10 = 8.',
        'New area: 15 × 8 = 120. It has gone from 100 to 120.',
      ], 'an increase of 20%'),
      example('Example 3', 'A rectangle’s length is increased by 50% and its width is decreased by 40%. What happens to its area?', [
        'Start with 10 by 10, area 100.',
        'Length: 15. Width: 10 − 4 = 6.',
        'New area: 15 × 6 = 90. It has gone from 100 down to 90.',
      ], 'a decrease of 10%'),
      tbl([
        ['Change to each side of a square', 'New side (from 10)', 'New area (from 100)', 'Change in area'],
        ['50% longer', '15', '225', '125% increase'],
        ['100% longer (doubled)', '20', '400', '300% increase'],
      ]),
      mistake('adding or subtracting the percentages. "Up 50%, down 20%" does <b>not</b> make the area 30% bigger; it makes it 20% bigger. And doubling the sides of a square (a 100% increase) makes the area 4 times as big: a 300% increase, not 100% or 200%.'),
      note('check the direction at the end. If the new area is less than 100, the area has decreased, and the question may ask for the size of the decrease, such as "10%".'),
    ].join(''),
  },
];
