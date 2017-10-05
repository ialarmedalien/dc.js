/* global appendChartID, loadDateFixture */
describe('dc.cboxMenu', function () {
    var id, chart;
    var data, regionDimension, regionGroup;
    var stateDimension, stateGroup;

    beforeEach(function () {
        data = crossfilter(loadDateFixture());
        regionDimension = data.dimension(function (d) { return d.region; });
        stateDimension = data.dimension(function (d) { return d.state; });

        regionGroup = regionDimension.group();
        stateGroup = stateDimension.group();

        id = 'cbox-menu';
        appendChartID(id);

        chart = dc.cboxMenu('#' + id);
        chart.dimension(stateDimension)
            .group(stateGroup)
            .transitionDuration(0);
        chart.render();
    });

    describe('generation', function () {
        it('we get something', function () {
            expect(chart).not.toBeNull();
        });
        it('should be registered', function () {
            expect(dc.hasChart(chart)).toBeTruthy();
        });
        it('sets order', function () {
            expect(chart.order()).toBeDefined();
        });
        it('sets prompt text', function () {
            expect(chart.promptText()).toBe('Select all');
        });
        it('creates an unordered list', function () {
            expect(chart.selectAll('ul')[0].length).toEqual(1);
        });
        it('creates li elements for each item', function () {
            console.log('chart.selectAll("li"):');
            console.log(chart.selectAll('li'));
            expect(chart.selectAll('li')[0].length).toEqual(stateGroup.all().length + 1);
        });
        it('creates input elements within each list item', function () {
            expect(chart.selectAll('li input')[0].length).toEqual(stateGroup.all().length + 1);
        });
        //         it('creates cbox tag', function () {
        //             expect(chart.selectAll('input[type=radio]').length).toEqual(1);
        //         });
        it('radio buttons are created by default', function () {
            expect(chart.selectAll('input[type=checkbox]')[0].length).toEqual(0);
            expect(chart.selectAll('input[type=radio]')[0].length).toEqual(stateGroup.all().length + 1);
        });
        //         it('has a select all option in single mode', function () {
        //             expect( chart.selectAll('input[type=reset]')[0].length ).toEqual(1);
        //         });
        it('uses a radio button for the select all option', function () {
            expect(chart.selectAll('input[type=radio]')[0].length).toEqual(stateGroup.all().length + 1);
        });
        it('can be made into a multiple', function () {
            console.log('Running make into a multiple');
            chart.multiple(true).redraw();
            console.log('make multiple: chart.selectAll("li input"):');
            console.log(chart.selectAll('li input'));
            expect(chart.selectAll('input[type=checkbox]')[0].length).toEqual(stateGroup.all().length);
        });
        it('does not use radio buttons for multiples', function () {
            chart.multiple(true).redraw();
            expect(chart.selectAll('input[type=radio]')[0].length).toEqual(0);
        });
        it('creates correct number of options', function () {
            expect(chart.selectAll('.dc-cbox-item')[0].length).toEqual(stateGroup.all().length);
        });
        //         it('select tag does not have size by default', function () {
        //             expect(chart.selectAll('select').attr('size')).toBeNull();
        //         });
        //         it('can have size set', function () {
        //             chart.numberVisible(10).redraw();
        //             expect(chart.selectAll('select').attr('size')).toEqual('10');
        //         });
        // select all:
        it('creates prompt option with empty value', function () {
            var option = chart.selectAll('li input')[0].pop();
            console.log(option);
            expect(option).not.toBeNull();
            expect(option.name).toMatch(/^domain_\d+$/);
            expect(option.value).toEqual('on');
        });
        it('creates prompt option with default prompt text', function () {
            var option = chart.selectAll('li label')[0].pop();
            console.log(option);
            expect(option.textContent).toEqual('Select all');
        });
        // select all multiple:
        it('has a reset button in multiple mode', function () {
            chart.multiple(true).redraw();
            var option = chart.selectAll('li input')[0].pop();
            console.log(option);
            expect(option.type).toEqual('reset');
            expect(chart.selectAll('input[type=reset]')[0].length).toEqual(1);
        });
        it('creates prompt option with default prompt text', function () {
            chart.multiple(true).redraw();
            var option = chart.selectAll('li input')[0].pop();
            console.log(option);
            expect(option.textContent).toEqual('Select all');
        });

    });

    describe('select options', function () {
        var firstOption, lastOption, lastIndex;
        beforeEach(function () {
            lastIndex = stateGroup.all().length - 1;
            firstOption = getOption(chart, 0);
            lastOption = getOption(chart, lastIndex);
        });
        it('display title as default option text', function () {
            expect(firstOption.textContent).toEqual('California: 3');
        });
        it('text property can be changed by changing title', function () {
            chart.title(function (d) { return d.key; }).redraw();
            firstOption = getOption(chart, 0);
            expect(firstOption.textContent).toEqual('California');
        });
        it('are ordered by ascending group key by default', function () {
            expect(firstOption.textContent).toEqual('California: 3');
            expect(lastOption.textContent).toEqual('Ontario: 2');
        });
        it('order can be changed by changing order function', function () {
            chart.order(function (a, b) { return a.key.length - b.key.length; });
            chart.redraw();
            lastOption = getOption(chart, lastIndex);
            expect(lastOption.textContent).toEqual('Mississippi: 2');
        });
    });

    describe('regular single select', function () {
        describe('selecting an option', function () {
            it('filters dimension based on selected option\'s value', function () {
                chart.onChange(stateGroup.all()[0].key);
                expect(chart.filter()).toEqual('California');
            });
            it('replaces filter on second selection', function () {
                chart.onChange(stateGroup.all()[0].key);
                chart.onChange(stateGroup.all()[1].key);
                expect(chart.filter()).toEqual('Colorado');
                expect(chart.filters().length).toEqual(1);
            });
            it('actually filters dimension', function () {
                chart.onChange(stateGroup.all()[0].key);
                expect(regionGroup.all()[0].value).toEqual(0);
                expect(regionGroup.all()[3].value).toEqual(2);
            });
            it('removes filter when prompt option is selected', function () {
                chart.onChange(null);
                expect(chart.hasFilter()).not.toBeTruthy();
                expect(regionGroup.all()[0].value).toEqual(1);
            });
        });

        describe('redraw with existing filter', function () {
            it('selects option corresponding to active filter', function () {
                chart.onChange(stateGroup.all()[0].key);
                chart.redraw();
                expect(chart.selectAll('input')[0][0].value).toEqual('California');
            });
        });

        afterEach(function () {
            chart.onChange(null);
        });
    });

    describe('multiple select', function () {
        beforeEach(function () {
            chart.multiple(true);
            chart.onChange([stateGroup.all()[0].key, stateGroup.all()[1].key]);
        });
        it('adds filters based on selections', function () {
            expect(chart.filters()).toEqual(['California', 'Colorado']);
            expect(chart.filters().length).toEqual(2);
        });
        it('actually filters dimension', function () {
            expect(regionGroup.all()[3].value).toEqual(2);
            expect(regionGroup.all()[4].value).toEqual(2);
        });
        it('removes all filters when prompt option is selected', function () {
            chart.onChange(null);
            expect(chart.hasFilter()).not.toBeTruthy();
            expect(regionGroup.all()[0].value).toEqual(1);
        });
        it('selects all options corresponding to active filters on redraw', function () {
            var selectedOptions = getSelectedOptions(chart);
            expect(selectedOptions.length).toEqual(2);
            expect(selectedOptions.map(function (d) { return d.value; })).toEqual(['California', 'Colorado']);
        });
        it('does not deselect previously filtered options when new option is added', function () {
            chart.onChange([stateGroup.all()[0].key, stateGroup.all()[1].key, stateGroup.all()[5].key]);

            var selectedOptions = getSelectedOptions(chart);
            expect(selectedOptions.length).toEqual(3);
            expect(selectedOptions.map(function (d) { return d.value; })).toEqual(['California', 'Colorado', 'Ontario']);
        });

        afterEach(function () {
            chart.onChange(null);
        });
    });

    describe('filterDisplayed', function () {
        it('only displays options whose value > 0 by default', function () {
            regionDimension.filter('South');
            chart.redraw();
            expect(chart.selectAll('.dc-cbox-item')[0].length).toEqual(1);

            console.log(getOption(chart, 0).textContent);

            expect(getOption(chart, 0).textContent).toEqual('California: 2');
        });
        it('can be overridden', function () {
            regionDimension.filter('South');
            chart.filterDisplayed(function (d) { return true; }).redraw();
            expect(chart.selectAll('.dc-cbox-item')[0].length).toEqual(stateGroup.all().length);
            expect(getOption(chart, stateGroup.all().length - 1).textContent).toEqual('Ontario: 0');
        });
        it('retains order with filtered options', function () {
            regionDimension.filter('Central');
            chart.redraw();
            expect(getOption(chart, 0).textContent).toEqual('Mississippi: 2');
            expect(getOption(chart, 1).textContent).toEqual('Ontario: 1');
        });
        afterEach(function () {
            regionDimension.filterAll();
        });
    });

    function getSelectedOptions (chart) {
        return chart.selectAll('.dc-cbox-item input')[0].filter(function (d) {
                return d.value && d.checked;
            });
    }

    function getOption (chart, i) {
        return chart.selectAll('.dc-cbox-item label')[0][i];
    }
});
