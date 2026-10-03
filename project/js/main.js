//==============================================
// COS30045 Data Visualisation - Assignment 3C
//   Nikki Ing and Andreana Panagiotidis
//
//  Table of Contents
//
//  1. Load the data 
// Load 3 CSV files and joins them together by country + year
//
//  2. Prepare the data
//
//  3. Set up the controls
//
//  4. Scatterplot setup 
//
//  5. Event listeners
//
//  6. Helper functions
//
//  7. Scatterplot
//
//  8. Line chart
//==============================================

//------------------
// 1. LOAD THE DATA 
//------------------


//Load the health expenditure data first
//Convert year and expenditure to numbers as each row comes in.
//CSV values are read as text, and the + turns them into numbers
d3.csv("data/health_expenditure.csv", function(d) {
    return {
        country: d.country,
        year: +d.year,
        expenditure: +d.expenditure_musd  //in millions of USD (PPP)
    };
}).then(function(expData) {

    //Now load the life expectancy data
    d3.csv("data/life_expectancy.csv", function(d) {
        return {
            country: d.country,
            year: +d.year,
            life: +d.life_expectancy  //life expectancy at birth, in years
        };
    }).then(function(lifeData) {

        //Now load the population data
        //Expected format: country,year,population
        d3.csv("data/population.csv", function(d) {
            return {
                country: d.country,
                year: +d.year,
                population: +d.population
            };
        }).then(function(popData) {

            //---------------------
            // 2. PREPARE THE DATA
            //---------------------

            //Merge life expectancy and expenditure together by country and year
            //Loop through life expectancy, and for each row look for a
            //matching row in the expenditure data (same country, same year)
            var merged = [];

            for (var i = 0; i < lifeData.length; i++) {
                for (var j = 0; j < expData.length; j++) {

                    if (lifeData[i].country === expData[j].country && lifeData[i].year === expData[j].year) {

                        merged.push({
                            country: lifeData[i].country,
                            year: lifeData[i].year,
                            life: lifeData[i].life,
                            expenditure: expData[j].expenditure
                        });

                        //Stop looking once we find the matching row
                        break;
                    }
                }
            }

            //Now bring population into the merged rows too, and use it to
            //calculate a NEW variable: health expenditure per person.
            //(expenditure is in millions of USD, so multiply by 1,000,000
            //before dividing by the headcount)
            var withPopulation = [];

            for (var i = 0; i < merged.length; i++) {
                for (var j = 0; j < popData.length; j++) {

                    if (merged[i].country === popData[j].country && merged[i].year === popData[j].year) {

                        withPopulation.push({
                            country: merged[i].country,
                            year: merged[i].year,
                            life: merged[i].life,
                            expenditure: merged[i].expenditure,
                            population: popData[j].population,
                            perCapita: (merged[i].expenditure * 1000000) / popData[j].population
                        });

                        //Stop looking once we find the matching row
                        break;
                    }
                }
            }

            //Build a list of unique countries (no repeats)
            //Used to fill the country dropdown
            var countries = [];
            for (var i = 0; i < merged.length; i++) {
                if (countries.indexOf(merged[i].country) === -1) {
                    countries.push(merged[i].country);
                }
            }
            countries.sort();  //alphabetical order

            //Build a list of unique years (no repeats)
            //Used to fill the year dropdown
            var years = [];
            for (var i = 0; i < merged.length; i++) {
                if (years.indexOf(merged[i].year) === -1) {
                    years.push(merged[i].year);
                }
            }
            //Sort numerically (oldest first)
            //By default it sorts by text instead of numbers
            years.sort(function(a, b) {
                return a - b;
            });

            //Work out the most recent year that has data for every country
            //Start from the newest year and work backwards until one has
            //a row for every country - that becomes the starting year
            var defaultYear = years[years.length - 1];

            for (var i = years.length - 1; i >= 0; i--) {

                //Count how many countries have data for this year
                var count = 0;
                for (var j = 0; j < merged.length; j++) {
                    if (merged[j].year === years[i]) {
                        count = count + 1;
                    }
                }

                //Every country has data for this year, so use it
                if (count === countries.length) {
                    defaultYear = years[i];
                    break;
                }
            }

            //------------------------------------
            // 3. SET UP THE CONTROLS (dropdowns)
            //------------------------------------

            //Fill in the year dropdown
            //D3 data join: one option is created for each year
            d3.select("#year-select")
                .selectAll("option")
                .data(years)
                .enter()
                .append("option")
                .attr("value", function(d) {
                    return d;
                })
                .text(function(d) {
                    return d;
                });

            //Fill in the country dropdown
            //("All countries" option already exists in the HTML)
            //The class "country-option" means selectAll only matches 
            //the options D3 creates
            d3.select("#country-select")
                .selectAll("option.country-option")
                .data(countries)
                .enter()
                .append("option")
                .attr("class", "country-option")
                .attr("value", function(d) {
                    return d;
                })
                .text(function(d) {
                    return d;
                });

            //Set the year dropdown to our default year
            d3.select("#year-select").property("value", defaultYear);

            //Starting message before a country has been picked
            d3.select("#linechart").html("<p>Select a country above to see its trend over time.</p>");

            //----------------------
            // 4. SCATTERPLOT SETUP
            //----------------------

            //Width and height of SVG canvas
            var w = 600;
            var h = 400;
            //Padding leaves room around the edges for the axes and labels
            var padding = 60;

            //viewBox lets the chart scale to fit its container
            //on different screen sizes
            var svg = d3.select("#scatterplot")
                .append("svg")
                .attr("viewBox", "0 0 " + w + " " + h);

            //Large faded year in the background of the scatterplot
            //(added first so it sits behind the grid and dots)
            var yearText = svg.append("text")
                .attr("x", w - padding - 10)
                .attr("y", h - padding - 15)
                .attr("text-anchor", "end")
                .attr("font-size", "60px")
                .attr("font-weight", "bold")
                .attr("fill", "#eeeeee");

            //Work out the min/max across ALL years, not just this year,
            //so the axis doesn't jump around when the year is changed
            var perCapitaMin = d3.min(withPopulation, function(d) { return d.perCapita; });
            var perCapitaMax = d3.max(withPopulation, function(d) { return d.perCapita; });
            var lifeMin = d3.min(withPopulation, function(d) { return d.life; });
            var lifeMax = d3.max(withPopulation, function(d) { return d.life; });

            //x scale: spending per person -> horizontal
            //Per-person spending only ranges from about $500 to $16,000
            var xScale = d3.scaleLinear()
                .domain([perCapitaMin, perCapitaMax])
                .range([padding, w - padding])
                .nice();

            //y scale: life expectancy -> vertical
            //The range is flipped because SVG y values count down from the top of the canvas
            //Space is added above and below and .nice() rounds the ends to tidy numbers
            var yScale = d3.scaleLinear()
                .domain([lifeMin - 1, lifeMax + 1])
                .range([h - padding, 20])
                .nice();

            //Light grid lines behind the dots
            //(an axis with very long ticks and no labels)
            //Vertical grid lines - one per x-axis tick
            svg.append("g")
                .attr("class", "grid")
                .attr("transform", "translate(0," + (h - padding) + ")")
                .call(d3.axisBottom(xScale)
                    .ticks(6)
                    .tickSize(-(h - padding - 20))
                    .tickFormat(""));

            //Horizontal grid lines - one per y-axis tick
            svg.append("g")
                .attr("class", "grid")
                .attr("transform", "translate(" + padding + ",0)")
                .call(d3.axisLeft(yScale)
                    .tickSize(-(w - 2 * padding))
                    .tickFormat(""));

            //x axis - ticks formatted as dollar amounts, e.g "$4,000"
            var xAxis = d3.axisBottom(xScale)
                .ticks(6)
                .tickFormat(function(d) {
                    return formatPerCapita(d);
                });

            //y axis - life expectancy in years
            var yAxis = d3.axisLeft(yScale);

            //Draw the x axis along the bottom of the plot area
            svg.append("g")
                .attr("transform", "translate(0," + (h - padding) + ")")
                .call(xAxis);

            //Draw the y axis along the left of the plot area
            svg.append("g")
                .attr("transform", "translate(" + padding + ",0)")
                .call(yAxis);

            //x axis label (centered underneath)
            svg.append("text")
                .attr("x", w / 2)
                .attr("y", h - 15)
                .attr("text-anchor", "middle")
                .attr("font-size", "12px")
                .text("Health expenditure per person (USD PPP)");

            //y axis label (rotated to run up the left side of the axis)
            svg.append("text")
                .attr("transform", "rotate(-90)")
                .attr("x", -h / 2)
                .attr("y", 15)
                .attr("text-anchor", "middle")
                .attr("font-size", "12px")
                .text("Life expectancy at birth (years)");

            //Draw the scatterplot
            drawScatterplot(defaultYear);

            //--------------------
            // 5. EVENT LISTENERS
            //--------------------

            //Year dropdown changed
            //Move the dots to the new year, and update the info card if
            //a country is currently selected
            d3.select("#year-select")
                .on("change", function() {

                    var year = +this.value;  //dropdown values are text, "+" makes it a number
                    drawScatterplot(year);

                    var country = d3.select("#country-select").property("value");
                    if (country !== "All") {
                        updateInfoCard(country, year);
                    }
                });

            //Country dropdown changed
            d3.select("#country-select")
                .on("change", function() {
                    selectCountry(this.value);
                });

            //---------------------
            // 6. HELPER FUNCTIONS
            //---------------------

            //Used by both the dropdown and clicking a dot
            //Updates everything that depends on the selected country:
            //the dropdown, the info card, the line chart, and the highlighted dot
            function selectCountry(country) {

                //Keep the dropdown in sync in case this was called from a click
                d3.select("#country-select").property("value", country);

                var year = +d3.select("#year-select").property("value");

                if (country === "All") {
                    //No country selected - reset the info card and line chart
                    d3.select("#country-name").text("Select a country");
                    d3.select("#life-value").text("—");
                    d3.select("#spending-value").text("—");
                    d3.select("#spending-value-pp").text("—");
                    d3.select("#population-value").text("—");
                    d3.select("#linechart").html("<p>Select a country above to see its trend over time.</p>");
                }
                else {
                    updateInfoCard(country, year);
                    drawLineChart(country);
                }

                //Redraw so the selected dot gets highlighted
                drawScatterplot(year);
            }

            //Update the info card on the right of the scatterplot
            //Shows life expectancy, total health expenditure, spend per person and population
            //for the chosen country in the chosen year
            function updateInfoCard(country, year) {

                //Find this country's row for this year in the withPopulation var
                var record = null;

                for (var i = 0; i < withPopulation.length; i++) {
                    if (withPopulation[i].country === country && withPopulation[i].year === year) {
                        record = withPopulation[i];
                        break;
                    }
                }

                d3.select("#country-name").text(country);

                if (record) {
                    d3.select("#life-value").text(record.life + " years");
                    d3.select("#spending-value").text(formatMoney(record.expenditure));
                    d3.select("#spending-value-pp").text(formatPerCapita(record.perCapita));
                }
                else {
                    //No matching row - say so instead of showing old values
                    d3.select("#life-value").text("No data for " + year);
                    d3.select("#spending-value").text("No data for " + year);
                    d3.select("#spending-value-pp").text("No data for " + year);
                }

                //Population comes straight from popData, so it still shows
                //for years where life expectancy is missing
                var popRecord = null;

                for (var i = 0; i < popData.length; i++) {
                    if (popData[i].country === country && popData[i].year === year) {
                        popRecord = popData[i];
                        break;
                    }
                }

                //Adds thousands separators
                //e.g 1234567 -> 1,234,567
                var formatPeople = d3.format(",");

                //D3 way: bind the record to the span with .datum(), then let
                //.text() read the bound data (d) through an accessor function
                d3.select("#population-value")
                    .datum(popRecord)
                    .text(function(d) {
                        if (d) {
                            return formatPeople(d.population) + " (" + formatPopulation(d.population) + ")";
                        }
                        return "No data for " + year;
                    });
            }

            //Turns a value in millions of USD into a readable $ amount
            //e.g. 743538.8 -> "$744B"
            function formatMoney(musd) {

                var usd = musd * 1000000;  //millions -> plain dollars

                //Trillions
                if (usd >= 1000000000000) {
                    return "$" + (usd / 1000000000000).toFixed(1) + "T";
                }
                //Billions
                if (usd >= 1000000000) {
                    return "$" + (usd / 1000000000).toFixed(0) + "B";
                }
                //Anything smaller is shown in millions
                return "$" + (usd / 1000000).toFixed(0) + "M";
            }

            //Turns a per-person dollar amount into a readable string
            //e.g. 4808.3 -> "$4,808"
            function formatPerCapita(usd) {
                return d3.format("$,.0f")(usd);
            }

            //Turns a population headcount into a readable string
            //e.g. 25700000 -> "25.7 million"
            function formatPopulation(people) {
                return (people / 1000000).toFixed(1) + " million";
            }

            //-------------------------------------------------
            // 7. SCATTERPLOT: health expenditure (x) vs life expectancy (y)
            //-------------------------------------------------

            //Called when the page loads, the year changes, and when a country is selected.
            //Uses D3 enter/update/exit so existing dots move to new positions
            //instead of being deleted and redrawn

            function drawScatterplot(year) {

                //Show the current year in the background
                yearText.text(year);

                //Only keep the rows for the selected year
                //(using withPopulation instead of merged, since that's the
                //array that already has perCapita calculated on it)
                var data = [];
                for (var i = 0; i < withPopulation.length; i++) {
                    if (withPopulation[i].year === year) {
                        data.push(withPopulation[i]);
                    }
                }

                //Which country should be highlighted in red
                var selectedCountry = d3.select("#country-select").property("value");

                var tooltip = d3.select("#tooltip");
    
                //DATA JOIN: match this year's rows to the dots already on the chart.
                //The key function matches them by country name. A country's old dot
                //becomes its new dot
                var dots = svg.selectAll("circle.dot")
                    .data(data, function(d) {
                        return d.country;
                    });

                //EXIT: Countries with no data this year shrink away
                dots.exit()
                    .transition()
                    .duration(500)
                    .attr("r", 0)
                    .remove();

                //ENTER: Countries new this year start at radius 0 and grow in.
                //On page load, every country is "new"
                var dotsEnter = dots.enter()
                    .append("circle")
                    .attr("class", "dot")
                    .attr("cx", function(d) { return xScale(d.perCapita); })
                    .attr("cy", function(d) { return yScale(d.life); })
                    .attr("r", 0);

                //UPDATE: New + existing dots together
                dotsEnter.merge(dots)

                //Hover: grow the dot and show the tooltip
                //The transition is named "hover" so it runs alongside the
                //main year-change transition instead of cancelling it.
                //Unnamed transition would leave the dot stuck halfway through changing colour
                    .on("mouseover", function(event, d) {

                        d3.select(this)
                            .transition("hover")
                            .duration(200)
                            .attr("r", 9);

                        tooltip.style("visibility", "visible")
                            .html(
                                "<strong>" + d.country + "</strong><br>" +
                                "Life expectancy: " + d.life + " years<br>" +
                                "Spend per person: " + formatPerCapita(d.perCapita) + "<br>" +
                                "Population: " + formatPopulation(d.population)
                            );
                    })

                    //Keep the tooltip next to the mouse pointer
                    .on("mousemove", function(event) {
                        tooltip.style("top", (event.pageY + 12) + "px")
                            .style("left", (event.pageX + 12) + "px");
                    })

                    //Shrink back to normal size and hide the tooltip
                    //Selected country goes back to its larger size of 8
                    .on("mouseout", function(event, d) {

                        var backToRadius = 5;
                        if (d.country === selectedCountry) {
                            backToRadius = 8;
                        }

                        d3.select(this)
                            .transition("hover")
                            .duration(200)
                            .attr("r", backToRadius);

                        tooltip.style("visibility", "hidden");
                    })

                    //Click a dot to select that country
                    .on("click", function(event, d) {
                        selectCountry(d.country);
                    })

                    //Animates from its old value to its new value over 750ms
                    .transition()
                    .duration(750)
                    //Move to this year's position
                    .attr("cx", function(d) {
                        return xScale(d.perCapita);
                    })
                    .attr("cy", function(d) {
                        return yScale(d.life);
                    })
                    //Selected country is larger
                    .attr("r", function(d) {
                        if (d.country === selectedCountry) {
                            return 8;
                        }
                        return 5;
                    })
                    //Selected country is red, all others teal
                    .attr("fill", function(d) {
                        if (d.country === selectedCountry) {
                            return "#d62728";
                        }
                        return "#2a9d8f";
                    })
                    //Selected country is solid, others slightly see-through
                    //so overlapping dots are still visible
                    .attr("fill-opacity", function(d) {
                        if (d.country === selectedCountry) {
                            return 1;
                        }
                        return 0.7;
                    })
                    //Black ring around the selected country only
                    .attr("stroke", "black")
                    .attr("stroke-width", function(d) {
                        if (d.country === selectedCountry) {
                            return 2;
                        }
                        return 0;
                    });
            }

            //-------------------------------------------------
            // 8. LINE CHART: selected country's trend over time
            //-------------------------------------------------

            function drawLineChart(country) {

                //Clear the previous country's chart
                d3.select("#linechart").html("");

                //Get this country's life expectancy rows, oldest year first
                //Lines must be drawn in year order or they zig-zag
                var lifeSeries = [];
                for (var i = 0; i < lifeData.length; i++) {
                    if (lifeData[i].country === country) {
                        lifeSeries.push(lifeData[i]);
                    }
                }
                lifeSeries.sort(function(a, b) {
                    return a.year - b.year;
                });

                //Get this country's health expenditure rows per person, oldest year first
                var expSeries = [];
                for (var i = 0; i < withPopulation.length; i++) {
                    if (withPopulation[i].country === country) {
                        expSeries.push(withPopulation[i]);
                    }
                }
                expSeries.sort(function(a, b) {
                    return a.year - b.year;
                });

                //Width and height of SVG canvas
                //Wider than the scatterplot since it spans the full width of the page
                var w = 1000;
                var h = 350;
                var padding = 65;

                var svg = d3.select("#linechart")
                    .append("svg")
                    .attr("viewBox", "0 0 " + w + " " + h);

                //First and last year in this country's data
                var yearMin = d3.min(lifeSeries, function(d) { return d.year; });
                var yearMax = d3.max(lifeSeries, function(d) { return d.year; });

                //x scale: year -> horizontal
                var xScale = d3.scaleLinear()
                    .domain([yearMin, yearMax])
                    .range([padding, w - padding]);

                var lifeMax = d3.max(lifeSeries, function(d) { return d.life; });

                //Left y scale: life expectancy
                var yScaleLife = d3.scaleLinear()
                    .domain([lifeMin - 1, lifeMax + 1])
                    .range([h - padding, padding]);

                var expMax = d3.max(expSeries, function(d) { return d.perCapita; });

                //Right y scale: health expenditure per person
                //Two separate y scales are needed because the two measures 
                //use completely different units (years vs dollars)
                var yScaleExp = d3.scaleLinear()
                    .domain([0, expMax])
                    .range([h - padding, padding]);

                
                //Shade the COVID-19 period (2020 to 2022) in light grey
                //so the dip in life expectancy has some context
                var covidStart = 2020;
                var covidEnd = 2022;

                //Grey strip from 2020 to 2022, the full height of the plot area
                svg.append("rect")
                    .attr("x", xScale(covidStart))
                    .attr("y", padding)
                    .attr("width", xScale(covidEnd) - xScale(covidStart))
                    .attr("height", h - 2 * padding)
                    .attr("fill", "#eeeeee");

                //"COVID-19" label centered at the bottom of the strip
                svg.append("text")
                    .attr("x", (xScale(covidStart) + xScale(covidEnd)) / 2)
                    .attr("y", h - padding - 10)
                    .attr("text-anchor", "middle")
                    .attr("font-size", "11px")
                    .attr("font-style", "italic")
                    .attr("fill", "#777")
                    .text("COVID-19");
  
                //Light grid lines behind the two lines
                //Vertical lines - one per year tick
                svg.append("g")
                    .attr("class", "grid")
                    .attr("transform", "translate(0," + (h - padding) + ")")
                    .call(d3.axisBottom(xScale)
                        .tickSize(-(h - 2 * padding))
                        .tickFormat(""));

                //Horizontal lines - these follow the left (life expectancy) axis
                svg.append("g")
                    .attr("class", "grid")
                    .attr("transform", "translate(" + padding + ",0)")
                    .call(d3.axisLeft(yScaleLife)
                        .tickSize(-(w - 2 * padding))
                        .tickFormat(""));

                //Line generators: turn each array of rows into an SVG path
                //x from the year, y from the matching scale
                var lifeLine = d3.line()
                    .x(function(d) { return xScale(d.year); })
                    .y(function(d) { return yScaleLife(d.life); });

                var expLine = d3.line()
                    .x(function(d) { return xScale(d.year); })
                    .y(function(d) { return yScaleExp(d.perCapita); });

                //Draw the life expectancy line (teal)
                //.datum() binds the whole array to one path, since a line is
                //a single shape rather than one shape per data point
                svg.append("path")
                    .datum(lifeSeries)
                    .attr("fill", "none")
                    .attr("stroke", "#2a9d8f")
                    .attr("stroke-width", 2)
                    .attr("d", lifeLine);

                //Draw the health expenditure line (red)
                svg.append("path")
                    .datum(expSeries)
                    .attr("fill", "none")
                    .attr("stroke", "firebrick")
                    .attr("stroke-width", 2)
                    .attr("d", expLine);

                //Small dots on each data point - life expectancy
                svg.selectAll("circle.life-point")
                    .data(lifeSeries)
                    .enter()
                    .append("circle")
                    .attr("class", "life-point")
                    .attr("cx", function(d) {
                        return xScale(d.year);
                    })
                    .attr("cy", function(d) {
                        return yScaleLife(d.life);
                    })
                    .attr("r", 3)
                    .attr("fill", "#2a9d8f");

                //Small dots on each data point - health expenditure
                svg.selectAll("circle.exp-point")
                    .data(expSeries)
                    .enter()
                    .append("circle")
                    .attr("class", "exp-point")
                    .attr("cx", function(d) {
                        return xScale(d.year);
                    })
                    .attr("cy", function(d) {
                        return yScaleExp(d.perCapita);
                    })
                    .attr("r", 3)
                    .attr("fill", "firebrick");

                //x axis - years
                //tickFormat stops D3 adding a comma
                var xAxis = d3.axisBottom(xScale)
                    .tickFormat(function(d) {
                        return d;
                    });

                svg.append("g")
                    .attr("transform", "translate(0," + (h - padding) + ")")
                    .call(xAxis);

                //Left y axis - life expectancy in years
                var yAxisLife = d3.axisLeft(yScaleLife);

                svg.append("g")
                    .attr("transform", "translate(" + padding + ",0)")
                    .call(yAxisLife);

                //Right y axis - health expenditure as readable $ amounts
                var yAxisExp = d3.axisRight(yScaleExp)
                    .tickFormat(function(d) {
                        return formatPerCapita(d);
                    });

                svg.append("g")
                    .attr("transform", "translate(" + (w - padding) + ",0)")
                    .call(yAxisExp);

                //Axis labels, coloured to match their lines
                //This acts as the legend for the chart
                svg.append("text")
                    .attr("x", padding)
                    .attr("y", padding - 20)
                    .attr("font-size", "12px")
                    .attr("fill", "#2a9d8f")
                    .attr("font-weight", "bold")
                    .text("Life Expectancy");

                svg.append("text")
                    .attr("x", w - padding - 200)
                    .attr("y", padding - 20)
                    .attr("font-size", "12px")
                    .attr("fill", "firebrick")
                    .attr("font-weight", "bold")
                    .text("Health Expenditure per Person");

                //Chart title: the selected country's name
                svg.append("text")
                    .attr("x", w / 2)
                    .attr("y", 20)
                    .attr("text-anchor", "middle")
                    .attr("font-weight", "bold")
                    .text(country);
            }

        });

    });

});