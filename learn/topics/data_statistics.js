// Learn pages for data handling and statistics. See docs/LEARN_GUIDELINES.md.
import { h, p, list, steps, key, display, note, mistake, frac, mixed, figure, example } from '../kit.js';

const hotChocolate = { type: 'table', headers: ['Month', 'Hot chocolates sold'], rows: [['October', 48], ['November', 75], ['December', 132], ['January', 96]] };
const booksPictogram = {
  type: 'pictogram', icon: '■', iconValue: 6,
  rows: [
    { label: 'Mystery', icons: 4, half: true },
    { label: 'History', icons: 2, half: false },
    { label: 'Science', icons: 6, half: false },
    { label: 'Adventure', icons: 3, half: true },
  ],
};
const libraryChart = { type: 'bar_chart', label: 'Bar chart of visitors to a library', labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'], values: [35, 50, 20, 45, 60], showValues: false, yStep: 10, max: 70, yLabel: 'Number of visitors' };
const parcelsGraph = { type: 'line_graph', label: 'Number of parcels delivered each day', labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'], values: [15, 30, 25, 45, 20], showValues: false, yStep: 5, max: 50, yLabel: 'Parcels', xLabel: 'Day' };
const travelPie = {
  type: 'pie_chart', label: 'How 160 pupils travel to school', total: 100,
  segments: [
    { label: 'Walk', value: 25, display: '25%' },
    { label: 'Bus', value: 15, display: '15%' },
    { label: 'Car', value: 40, display: '40%' },
    { label: 'Bicycle', value: 20, display: '20%' },
  ],
};

export const pages = [
  {
    id: 'data_tables',
    title: 'Reading tables',
    skills: ['data_tables'],
    prereqs: ['ar_add_subtract_word'],
    summary: 'Find numbers in a table and use them to work out differences, totals, the range and percentages.',
    body: [
      h('The big idea'),
      p('A <b>table</b> sorts information into <b>rows</b> (going across) and <b>columns</b> (going down). The <b>headings</b> along the top and down the side tell you what each number means. To find a number, go along the right row and down the right column: the number you want is where they meet.'),
      p('Most table questions are then ordinary adding and subtracting. The hard part is reading the question carefully so you pick the right numbers.'),
      key('Words to watch for', list([
        '<b>"How many more"</b>, <b>"difference"</b>, <b>"by how much"</b>: subtract the smaller number from the bigger one.',
        '<b>"Altogether"</b>, <b>"total"</b>, <b>"together"</b>: add.',
        '<b>"Range"</b>: the highest number take away the lowest number (see [[stat_median_mode_range]]).',
      ])),
      example('Example 1', 'The table shows how many hot chocolates a café sold. How many more were sold in December than in November?', [
        'Find the two numbers: December 132, November 75.',
        '"How many more" means subtract: 132 − 75 = <b>57</b>.',
      ], '57', { visual: hotChocolate }),
      example('Example 2', 'Use the same table. (a) How many were sold in December and January together? (b) What is the range of the numbers sold?', [
        '(a) "Together" means add: 132 + 96 = <b>228</b>.',
        '(b) The highest number is 132 (December) and the lowest is 48 (October). Range: 132 − 48 = <b>84</b>.',
      ], '(a) 228 (b) 84'),
      h('Tables with a total'),
      p('Some tables have a <b>Total</b> row. The other rows must add up to it, so you can use it to find a missing number. You can also use it to find a <b>percentage</b>: what part of the total one row is, written out of 100.'),
      key('Percentage of the total', display(frac('the number in that row', 'the total') + ', then write the fraction out of 100') + p('If the total is 200, halve both numbers. If the total is 20, multiply both by 5. If the total is 100, the number already is the percentage.')),
      example('Example 3', '200 pupils were asked how they travel to school. One number has been rubbed out. (a) How many pupils come by bus? (b) What percentage of the pupils walk?', [
        '(a) The rows add up to the total: 70 + ? + 80 = 200. So the bus number is 200 − 70 − 80 = <b>50</b>.',
        '(b) Walkers as a fraction of the total: ' + frac(70, 200) + '.',
        'Halve the top and bottom to get a number out of 100: ' + frac(70, 200) + ' = ' + frac(35, 100) + ' = <b>35%</b>.',
      ], '(a) 50 (b) 35%', { visual: { type: 'table', headers: ['Way to school', 'Number of pupils'], rows: [['Walk', 70], ['Bus', '?'], ['Car', 80], ['Total', 200]] } }),
      example('Example 4', 'In a survey of 40 people, 18 said "Yes". What percentage said "Yes"?', [
        'As a fraction: ' + frac(18, 40) + '. There is no whole number that turns 40 into 100, so simplify first.',
        'Divide the top and bottom by 2: ' + frac(9, 20) + '. Now multiply both by 5: ' + frac(45, 100) + '.',
        'So <b>45%</b> said "Yes". (More on this in [[dec_fraction_percent_conversion]].)',
      ], '45%'),
      mistake('taking away the wrong way round. "How many more in December than November" is 132 − 75, not 75 − 132. The answer to a "how many more" question is never negative.'),
      mistake('reading the number from the row above or below. Put a finger or ruler under the row you want.'),
      note('check a missing number by adding the whole column again: 70 + 50 + 80 = 200. ✓'),
    ].join(''),
  },
  {
    id: 'data_pictograms',
    title: 'Pictograms',
    skills: ['data_pictograms'],
    prereqs: ['ar_multiplication_context'],
    summary: 'Use the key of a pictogram to turn symbols (and half symbols) into numbers, then compare and total them.',
    body: [
      h('The big idea'),
      p('A <b>pictogram</b> shows numbers using little pictures, or <b>symbols</b>. Usually one symbol does not mean 1: the <b>key</b> tells you how many each symbol stands for. If the key says one star stands for 2 goals, then 5 stars mean 5 × 2 = 10 goals.'),
      p('Sometimes a row ends with part of a symbol. Half a symbol stands for half the key number.'),
      key('Reading a pictogram', display('value = number of whole symbols × key value + any part symbol') + p('Half a symbol = key value ÷ 2. So if one symbol stands for 6, half a symbol stands for 3.')),
      h('Method'),
      steps([
        'Read the key first. Write down what one symbol stands for, and what half a symbol stands for.',
        'Count the whole symbols in the row you need and multiply by the key value.',
        'Add on the half symbol if there is one.',
        'Then answer the question: add for totals, subtract for "how many more" or "difference".',
      ]),
      example('Example 1', 'The pictogram shows goals scored by four teams. How many goals did Rovers score?', [
        'The key says each ★ stands for 2 goals.',
        'Rovers have 5 stars: 5 × 2 = <b>10</b>.',
      ], '10 goals', { visual: { type: 'pictogram', icon: '★', iconValue: 2, rows: [{ label: 'United', icons: 3, half: false }, { label: 'City', icons: 1, half: false }, { label: 'Rovers', icons: 5, half: false }, { label: 'Town', icons: 4, half: false }] } }),
      example('Example 2', 'The pictogram shows books borrowed from a library. How many more science books were borrowed than mystery books?', [
        'Key: one ■ stands for 6 books, so half a symbol stands for 6 ÷ 2 = 3 books.',
        'Science: 6 whole symbols, so 6 × 6 = 36 books.',
        'Mystery: 4 whole symbols and a half: 4 × 6 + 3 = 24 + 3 = 27 books.',
        'Difference: 36 − 27 = <b>9</b>.',
      ], '9 books', { visual: booksPictogram }),
      example('Example 3', 'Use the same pictogram. How many books were borrowed altogether?', [
        'Work out every row first. Mystery 27 and Science 36 (from Example 2).',
        'History: 2 × 6 = 12. Adventure: 3 × 6 + 3 = 21.',
        'Total: 27 + 12 + 36 + 21 = <b>96</b>.',
      ], '96 books'),
      h('Drawing a pictogram'),
      p('To show a number, work backwards: divide by the key value. If one symbol stands for 4 cars and you need to show 30 cars, 30 ÷ 4 = 7 remainder 2. That is 7 whole symbols (28 cars) and 2 more cars, which is half of 4, so draw <b>7 and a half</b> symbols. With a key of 4, a quarter of a symbol would stand for 1.'),
      mistake('counting the symbols and forgetting the key. Science has 6 symbols, but that means 36 books, not 6.'),
      mistake('counting a half symbol as a whole one, or ignoring it. Look closely at the end of each row.'),
      note('if all you need is a difference, you can compare the symbols first. Science has ' + mixed(1, 1, 2) + ' more symbols than Mystery, and ' + mixed(1, 1, 2) + ' × 6 = 9. ✓'),
    ].join(''),
  },
  {
    id: 'data_bar_charts',
    title: 'Reading bar charts',
    skills: ['data_bar_charts'],
    prereqs: ['data_tables'],
    summary: 'Read the scale on a bar chart, find the height of each bar, and use the values to find totals, differences and which statements are true.',
    body: [
      h('The big idea'),
      p('A <b>bar chart</b> shows numbers as bars: the taller the bar, the bigger the number. The numbers up the side make the <b>scale</b>. To read a bar, look across from its top to the scale.'),
      p('The scale does not always go up in 1s. It might go up in 2s, 5s or 10s, so the first job is always to work out what each line on the scale is worth.'),
      key('Reading a bar', steps([
        'Look at two labelled lines next to each other on the scale and find the gap between them (for example 0, 10, 20 goes up in 10s).',
        'Find where the top of the bar is. If it is on a line, read the number on that line.',
        'If it is halfway between two lines, the value is halfway between those two numbers.',
      ])),
      figure(libraryChart, 'Visitors to a library. The scale goes up in 10s.'),
      p('In this chart, Tuesday’s bar stops on the line for 50, so 50 people visited. Monday’s bar stops halfway between 30 and 40, so 35 people visited.'),
      example('Example 1', 'How many more people visited the library on Friday than on Wednesday?', [
        'Friday: the bar reaches the line for 60. Wednesday: the bar reaches 20.',
        '60 − 20 = <b>40</b>.',
      ], '40 people'),
      example('Example 2', 'How many people visited the library during the whole week?', [
        'Read every bar: Monday 35, Tuesday 50, Wednesday 20, Thursday 45 (halfway between 40 and 50), Friday 60.',
        'Add them: 35 + 50 + 20 + 45 + 60 = <b>210</b>.',
      ], '210 people'),
      h('Which statement is true?'),
      p('Some questions give you several sentences about a chart and ask which one must be true. Read every value first, then test each sentence one at a time against the numbers. Do not stop at a sentence that "looks right": check it.'),
      example('Example 3', 'Which statement is true? A: East has the highest value. B: South is 10 more than West. C: North and East total 45. D: West is greater than South.', [
        'Read the bars (the scale goes up in 5s): North 25, South 40, East 15, West 30.',
        'A: the highest is South (40), not East. False.',
        'B: 40 − 30 = 10. <b>True.</b>',
        'C: 25 + 15 = 40, not 45. False. D: 30 is less than 40. False.',
      ], 'B', { visual: { type: 'bar_chart', label: 'Regional totals', labels: ['North', 'South', 'East', 'West'], values: [25, 40, 15, 30], showValues: false, yStep: 5, max: 45, yLabel: 'Total' } }),
      mistake('assuming each line on the scale is worth 1. In the library chart each line is worth 10, so a bar that stops 5 lines up stands for 50, not 5.'),
      mistake('reading the top of the bar from the wrong side of the chart. Use a ruler held flat from the top of the bar across to the scale.'),
      note('when you add up many bars, add the easy pairs first: 50 + 60 = 110 and 35 + 45 = 80, then 110 + 80 + 20 = 210.'),
    ].join(''),
  },
  {
    id: 'data_line_graphs',
    title: 'Reading line graphs',
    skills: ['data_line_graphs'],
    prereqs: ['data_bar_charts'],
    summary: 'Read values from a line graph, find the change between two points, and spot where the line rises or falls the most.',
    body: [
      h('The big idea'),
      p('A <b>line graph</b> shows how something changes, usually over time. Each value is plotted as a point and the points are joined with straight lines. It is read like a bar chart: find the point, then look across to the scale.'),
      p('The joining lines make it easy to see the <b>trend</b>: a line going up from left to right means the numbers are increasing, a line going down means they are decreasing, and the steeper the line, the bigger the change.'),
      figure(parcelsGraph, 'Parcels delivered each day. The scale goes up in 5s.'),
      key('Reading a line graph', list([
        'Find the day (or time) on the bottom axis and go straight up to the point.',
        'Look across to the scale to read its value. Check what each line on the scale is worth first.',
        'The <b>change</b> between two days is the difference between their values: bigger − smaller.',
      ])),
      example('Example 1', 'Use the graph. By how many did the number of parcels change between Wednesday and Thursday?', [
        'Wednesday’s point is on the line for 25. Thursday’s point is on the line for 45.',
        'Change: 45 − 25 = <b>20</b>. The line goes up, so it was a rise of 20.',
      ], '20 parcels'),
      example('Example 2', 'Between which two days next to each other did the number of parcels fall the most?', [
        'Read every point: Mon 15, Tue 30, Wed 25, Thu 45, Fri 20.',
        'Changes: Mon→Tue up 15, Tue→Wed down 5, Wed→Thu up 20, Thu→Fri down 25.',
        'The two falls are 5 and 25. The biggest fall is <b>Thursday to Friday</b>, and it is also the steepest downhill part of the line.',
      ], 'Thursday to Friday (a fall of 25)'),
      example('Example 3', 'On how many days were more than 20 parcels delivered?', [
        'More than 20 means 21 or above, so 20 itself does not count.',
        'Tuesday 30, Wednesday 25 and Thursday 45 are more than 20. Monday (15) and Friday (20) are not.',
      ], '3 days'),
      p('Graphs of things that change smoothly, like temperature through a day, can be read <b>between</b> the points too: halfway between 2 pm and 3 pm the line shows roughly the temperature at 2:30 pm. For counts like parcels per day, only the points themselves are real values.'),
      mistake('reading the height of the point from the scale in 1s when it goes up in 5s or 10s. Count the lines carefully.'),
      mistake('answering "which day had the biggest change" with the day that had the highest value. A change is about the gap between two points, not one point on its own.'),
      note('to compare two days that are far apart, read each value separately and subtract; do not try to measure the slope.'),
    ].join(''),
  },
  {
    id: 'data_pie_charts',
    title: 'Reading pie charts',
    skills: ['data_pie_charts'],
    prereqs: ['pct_percent_of_amount', 'frac_of_amount'],
    summary: 'Use the percentages or angles in a pie chart to find how many are in each slice, or work back from one slice to the total.',
    body: [
      h('The big idea'),
      p('A <b>pie chart</b> is a circle cut into slices, called <b>sectors</b>. The whole circle stands for everybody in the survey, and each sector shows what part of the whole one group is. A pie chart shows <b>fractions</b> or <b>percentages</b> of a total, so you need to know the total before you can find how many are in a sector.'),
      figure(travelPie, 'How 160 pupils travel to school.'),
      key('Pie chart facts', list([
        'The whole circle is 100% of the total. The percentages always add up to 100%.',
        'To find how many are in a sector, find that percentage of the total (see [[pct_percent_of_amount|percentages of amounts]]).',
        'The whole circle is also 360°. A sector of 180° is ' + frac(1, 2) + ', 90° is ' + frac(1, 4) + ', 120° is ' + frac(1, 3) + ' and 60° is ' + frac(1, 6) + '.',
      ])),
      example('Example 1', 'Use the pie chart. How many of the 160 pupils travel by car?', [
        'Car is 40%.',
        '10% of 160 = 16, so 40% = 4 × 16 = <b>64</b>.',
      ], '64 pupils'),
      example('Example 2', 'How many of the 160 pupils travel by bus?', [
        'Bus is 15%, and 15% = 10% + 5%.',
        '10% of 160 = 16, and 5% is half of that, 8.',
        '16 + 8 = <b>24</b>.',
      ], '24 pupils'),
      p('Check: walk 25% is 40 pupils and bicycle 20% is 32 pupils. 40 + 24 + 64 + 32 = 160. ✓'),
      h('Working back to the total'),
      p('Sometimes you are told how many are in one sector and must find the whole. Find what 1%, 5% or 10% is worth, then build up to 100%.'),
      example('Example 3', 'In another school, 35% of the pupils cycle. 63 pupils cycle. How many pupils are in the school?', [
        '35% is 63. 35 is 7 lots of 5, so 5% is 63 ÷ 7 = 9.',
        '100% is 20 lots of 5%: 20 × 9 = <b>180</b>.',
        'Check: 35% of 180 = 18 + 18 + 18 + 9 = 63. ✓',
      ], '180 pupils'),
      h('Pie charts with angles'),
      p('Instead of percentages, a pie chart may show the <b>angle</b> of each sector. The fraction of the whole is the angle out of 360°. For example, a 72° sector is ' + frac(72, 360) + ' = ' + frac(1, 5) + ' of the circle.'),
      example('Example 4', '60 children chose their favourite fruit. The pie chart shows the angle of each sector. How many chose each fruit?', [
        'Apples: 180° out of 360° is ' + frac(1, 2) + '. ' + frac(1, 2) + ' of 60 = <b>30</b>.',
        'Bananas: 120° is ' + frac(1, 3) + ' of the circle. ' + frac(1, 3) + ' of 60 = <b>20</b>.',
        'Grapes: 60° is ' + frac(1, 6) + ' of the circle. ' + frac(1, 6) + ' of 60 = <b>10</b>.',
        'Check: 30 + 20 + 10 = 60. ✓',
      ], 'Apples 30, bananas 20, grapes 10', { visual: { type: 'pie_chart', label: 'Favourite fruit of 60 children', total: 360, segments: [{ label: 'Apples', value: 180, display: '180°' }, { label: 'Bananas', value: 120, display: '120°' }, { label: 'Grapes', value: 60, display: '60°' }] } }),
      mistake('treating the percentage as the number of people. 40% of 160 pupils is 64 pupils, not 40.'),
      mistake('comparing sectors from two different pie charts. A big slice of a small school can be fewer pupils than a small slice of a big school. Always work out the actual numbers.'),
      note('a sector that looks like a quarter of the circle should be about 25% (or 90°). Use this to check your reading.'),
    ].join(''),
  },
  {
    id: 'stat_mean',
    title: 'The mean (average)',
    skills: ['stat_mean'],
    prereqs: ['ar_divide_equal_groups', 'ar_add_subtract_word'],
    summary: 'Find the mean of a set of numbers, use it to find a total or a missing value, and see what happens when the numbers change.',
    body: [
      h('The big idea'),
      p('The <b>mean</b> is a fair share. Imagine four friends with different numbers of sweets who put them all in one pile and share them out equally. The number each friend ends up with is the mean. When an 11+ question says <b>average</b>, it usually means the mean.'),
      figure({ type: 'bar_chart', label: 'Bar chart of sweets each friend has', labels: ['Ali', 'Ben', 'Cara', 'Dev'], values: [9, 4, 7, 4], showValues: true, yStep: 1, max: 10, yLabel: 'Sweets' }, 'Together they have 9 + 4 + 7 + 4 = 24 sweets. Shared equally, each gets 24 ÷ 4 = 6: the mean is 6.'),
      key('The mean', display('mean = total ÷ how many numbers') + p('Turned around, this gives:') + display('total = mean × how many numbers')),
      p('The second line is the key to most harder mean questions: if you know the mean and how many there are, you know the total.'),
      example('Example 1', 'Find the mean of 12, 15, 9, 14 and 10.', [
        'Total: 12 + 15 + 9 + 14 + 10 = 60.',
        'There are 5 numbers: 60 ÷ 5 = <b>12</b>.',
      ], '12'),
      example('Example 2', 'The mean weight of 9 parcels is 7 kg. What do they weigh altogether?', [
        'Total = mean × how many = 7 × 9 = <b>63</b> kg.',
      ], '63 kg'),
      h('Finding a missing value'),
      steps([
        'Use the mean to find what the total of <b>all</b> the numbers must be.',
        'Add the numbers you know.',
        'The missing number is the difference.',
      ]),
      example('Example 3', 'The mean of 5 test marks is 32. Four of the marks are 28, 35, 30 and 36. What is the fifth mark?', [
        'Total of all 5 marks: 32 × 5 = 160.',
        'Total of the four you know: 28 + 35 + 30 + 36 = 129.',
        'Missing mark: 160 − 129 = <b>31</b>.',
      ], '31'),
      example('Example 4', 'A cricketer has a mean score of 45 runs over 4 games. In her 5th game she scores 70. What is her new mean?', [
        'Old total: 45 × 4 = 180 runs.',
        'New total: 180 + 70 = 250 runs, now over 5 games.',
        'New mean: 250 ÷ 5 = <b>50</b>.',
      ], '50 runs'),
      h('Changing every number'),
      list([
        'Add the same amount to every number and the mean goes up by that amount. A mean of 16 with 3 added to every score becomes 19.',
        'Multiply every number by the same amount and the mean is multiplied too. A mean of 31 with every value multiplied by 4 becomes 124.',
      ]),
      mistake('dividing by the wrong count. In Example 4 the new total is shared over 5 games, not 4.'),
      mistake('averaging the old mean and the new score: (45 + 70) ÷ 2 = 57.5 is wrong, because the 45 stands for 4 games and the 70 for only 1. Always go back to totals.'),
      note('the mean must lie between the smallest and the largest number. A mean of 12 for numbers from 9 to 15 is sensible; a mean of 20 would not be.'),
    ].join(''),
  },
  {
    id: 'stat_median_mode_range',
    title: 'Median, mode and range',
    skills: ['stat_median_mode_range'],
    prereqs: ['np_compare_order_numbers'],
    summary: 'Put a list of numbers in order to find the median and range, and count to find the mode.',
    body: [
      h('The big idea'),
      p('The [[stat_mean|mean]] is one way to describe a set of numbers. Here are three more. Two of them are "middle" or "typical" values and one measures how spread out the numbers are.'),
      key('Three words to learn', list([
        'The <b>median</b> is the middle number when the numbers are put in order.',
        'The <b>mode</b> is the number that appears most often. It is also called the <b>modal</b> value.',
        'The <b>range</b> is the biggest number take away the smallest. It tells you how spread out the numbers are.',
      ])),
      p('One way to remember: <b>mode</b> sounds like "most", and the <b>median</b> is in the middle, like the central reservation, or median strip, of a road.'),
      h('The median'),
      steps([
        'Write the numbers in order from smallest to largest. Cross them off as you go so none are missed.',
        'Count them. If there is an odd number of values, the median is the one in the middle.',
        'If there is an even number, there are two middle values: the median is halfway between them.',
      ]),
      example('Example 1', 'Find the median of 34, 18, 27, 9, 41, 22, 30.', [
        'In order: 9, 18, 22, 27, 30, 34, 41.',
        'There are 7 numbers, so the middle one is the 4th, with 3 on each side: <b>27</b>.',
      ], '27'),
      example('Example 2', 'Find the median of 12, 5, 9, 15, 8, 20.', [
        'In order: 5, 8, 9, 12, 15, 20.',
        'There are 6 numbers, so the two middle ones are the 3rd and 4th: 9 and 12.',
        'Halfway between 9 and 12: (9 + 12) ÷ 2 = 21 ÷ 2 = <b>10.5</b>.',
      ], '10.5'),
      h('The mode'),
      example('Example 3', 'What is the mode of 23, 41, 17, 41, 30, 17, 41, 26, 35, 12?', [
        'Count how many times each number appears. Tick them off as you go.',
        '41 appears 3 times, 17 appears twice, and every other number once.',
        'The mode is <b>41</b>.',
      ], '41'),
      p('A list can have two modes if two numbers tie for most often, and no mode if every number appears the same number of times.'),
      h('The range'),
      example('Example 4', 'A pupil measures some distances in metres: 64, 15, 88, 37, 120, 9, 73. What is the range?', [
        'Biggest: 120 m. Smallest: 9 m.',
        'Range: 120 − 9 = <b>111 m</b>.',
      ], '111 m'),
      example('Example 5', 'The lowest of some readings is 12 m. The range of the readings is 25 m. What is the highest reading?', [
        'Range = highest − lowest, so highest = lowest + range.',
        '12 + 25 = <b>37 m</b>.',
      ], '37 m'),
      example('Example 6', 'A number x is added to the list 2, 14, 36, 38. The median of all five numbers is 14. What is the largest x could be?', [
        'With five numbers in order, the median is the 3rd one, and it must be 14.',
        'If x were bigger than 14, the order would be 2, 14, then x or 36, and the 3rd number would be more than 14. So x can be at most 14.',
        'Try x = 14: 2, 14, 14, 36, 38 has median 14. ✓',
      ], '14'),
      mistake('finding the middle of the list without putting it in order first. In Example 1 the number in the middle of the unsorted list is 9, which is actually the smallest.'),
      mistake('giving the range as two numbers, like "9 to 120". The range is one number: the difference, 111.'),
      mistake('giving how many times the mode appears instead of the mode itself. In Example 3 the answer is 41, not 3.'),
      note('with 7 numbers in order, the median is the 4th; with 9, the 5th. Add 1 to how many numbers there are and halve it to find the middle place.'),
    ].join(''),
  },
];
