//Load the health expenditure data first
//Convert year and expenditure to numbers as each row comes in
d3.csv("health_expenditure.csv", function(d) {
    return {
        country: d.country,
        year: +d.year,
        expenditure: +d.expenditure_musd
    };
}).then(function(expData) {

    //Now load the life expectancy data
    //Convert year and life expectancy to numbers as each row comes in
    d3.csv("life_expectancy.csv", function(d) {
        return {
            country: d.country,
            year: +d.year,
            life: +d.life_expectancy
        };
    }).then(function(lifeData) {

        //Merge the two datasets together by country and year
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

        //Build a list of unique countries (no repeats)
        var countries = [];
        for (var i = 0; i < merged.length; i++) {
            if (countries.indexOf(merged[i].country) === -1) {
                countries.push(merged[i].country);
            }
        }
        countries.sort();

        //Build a list of unique years (no repeats)
        var years = [];
        for (var i = 0; i < merged.length; i++) {
            if (years.indexOf(merged[i].year) === -1) {
                years.push(merged[i].year);
            }
        }
        years.sort(function(a, b) {
            return a - b;
        });

        //Work out the most recent year that has data for every country
        //(the newest year is often missing a few countries)
        var defaultYear = years[years.length - 1];

        for (var i = years.length - 1; i >= 0; i--) {

            var count = 0;
            for (var j = 0; j < merged.length; j++) {
                if (merged[j].year === years[i]) {
                    count = count + 1;
                }
            }

            if (count === countries.length) {
                defaultYear = years[i];
                break;
            }
        }

        //Fill in the year dropdown
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

        //Draw the scatterplot for the first time
        drawScatterplot(defaultYear);

        //Year dropdown changed
        d3.select("#year-select")
            .on("change", function() {

                var year = +this.value;
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

        //Used by both the dropdown and clicking a dot on the scatterplot
        function selectCountry(country) {

            //Keep the dropdown in sync in case this was called from a click
            d3.select("#country-select").property("value", country);

            var year = +d3.select("#year-select").property("value");

            if (country === "All") {
                d3.select("#country-name").text("Select a country");
                d3.select("#life-value").text("—");
                d3.select("#spending-value").text("—");
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
        function updateInfoCard(country, year) {

            var record = null;

            for (var i = 0; i < merged.length; i++) {
                if (merged[i].country === country && merged[i].year === year) {
                    record = merged[i];
                    break;
                }
            }

            d3.select("#country-name").text(country);

            if (record) {
                d3.select("#life-value").text(record.life + " years");
                d3.select("#spending-value").text(formatMoney(record.expenditure));
            }
            else {
                d3.select("#life-value").text("No data for " + year);
                d3.select("#spending-value").text("No data for " + year);
            }
        }

        //Turns a value in millions of USD into a readable $ amount
        //e.g. 743538.8 -> "$744B"
        function formatMoney(musd) {

            var usd = musd * 1000000;

            if (usd >= 1000000000000) {
                return "$" + (usd / 1000000000000).toFixed(1) + "T";
            }
            if (usd >= 1000000000) {
                return "$" + (usd / 1000000000).toFixed(0) + "B";
            }
            return "$" + (usd / 1000000).toFixed(0) + "M";
        }

        //-------------------------------------------------
        //Scatterplot: health expenditure (x) vs life expectancy (y)
        //-------------------------------------------------
        function drawScatterplot(year) {

            //Clear whatever was drawn before
            d3.select("#scatterplot").html("");

            //Only keep the rows for the selected year
            var data = [];
            for (var i = 0; i < merged.length; i++) {
                if (merged[i].year === year) {
                    data.push(merged[i]);
                }
            }

            var selectedCountry = d3.select("#country-select").property("value");

            //Width and height of SVG canvas
            var w = 600;
            var h = 400;
            var padding = 60;

            var svg = d3.select("#scatterplot")
                .append("svg")
                .attr("viewBox", "0 0 " + w + " " + h);

            //Work out the min/max across ALL years, not just this year,
            //so the axis doesn't jump around when the year is changed
            var expMin = d3.min(merged, function(d) { return d.expenditure; });
            var expMax = d3.max(merged, function(d) { return d.expenditure; });
            var lifeMin = d3.min(merged, function(d) { return d.life; });
            var lifeMax = d3.max(merged, function(d) { return d.life; });

            //Log scale for expenditure — total spending ranges from about
            //$18 billion up to $5.4 trillion across these countries, mostly
            //because of population size rather than health spending itself.
            //A normal (linear) scale would squash every country except the
            //US into the very left edge of the chart.
            var xScale = d3.scaleLog()
                .domain([expMin, expMax])
                .range([padding, w - padding]);

            var yScale = d3.scaleLinear()
                .domain([lifeMin, lifeMax])
                .range([h - padding, padding]);

            //Create a bottom x-axis, formatting the tick labels using formatMoney
            var xAxis = d3.axisBottom(xScale)
                .ticks(5)
                .tickFormat(function(d) {
                    return formatMoney(d);
                });

            //Create a left y-axis
            var yAxis = d3.axisLeft(yScale);

            //Add the x-axis to the SVG
            svg.append("g")
                .attr("transform", "translate(0," + (h - padding) + ")")
                .call(xAxis);

            //Add the y-axis to the SVG
            svg.append("g")
                .attr("transform", "translate(" + padding + ",0)")
                .call(yAxis);

            //Axis titles
            svg.append("text")
                .attr("x", w / 2)
                .attr("y", h - 15)
                .attr("text-anchor", "middle")
                .attr("font-size", "12px")
                .text("Health expenditure, total (log scale)");

            svg.append("text")
                .attr("x", padding)
                .attr("y", padding - 15)
                .attr("font-size", "12px")
                .text("Life expectancy (years)");

            //Where the tooltip div lives (defined in index.html)
            var tooltip = d3.select("#tooltip");

            //Draw one circle for each country
            svg.selectAll("circle")
                .data(data)
                .enter()
                .append("circle")
                .attr("class", "dot")
                .attr("cx", function(d) {
                    return xScale(d.expenditure);
                })
                .attr("cy", function(d) {
                    return yScale(d.life);
                })
                .attr("r", function(d) {
                    if (d.country === selectedCountry) {
                        return 8;
                    }
                    return 5;
                })
                .attr("fill", function(d) {
                    if (d.country === selectedCountry) {
                        return "#d62728";
                    }
                    return "#4682b4";
                })

                //Grow the dot slightly and show the tooltip
                .on("mouseover", function(event, d) {

                    d3.select(this)
                        .transition()
                        .duration(200)
                        .attr("r", 9);

                    tooltip.style("visibility", "visible")
                        .html(
                            "<strong>" + d.country + "</strong><br>" +
                            "Life expectancy: " + d.life + " years<br>" +
                            "Health spend: " + formatMoney(d.expenditure)
                        );
                })

                //Follow the mouse
                .on("mousemove", function(event) {
                    tooltip.style("top", (event.pageY + 12) + "px")
                        .style("left", (event.pageX + 12) + "px");
                })

                //Shrink the dot back down and hide the tooltip
                .on("mouseout", function(event, d) {

                    var backToRadius = 5;
                    if (d.country === selectedCountry) {
                        backToRadius = 8;
                    }

                    d3.select(this)
                        .transition()
                        .duration(200)
                        .attr("r", backToRadius);

                    tooltip.style("visibility", "hidden");
                })

                //Clicking a dot selects that country
                .on("click", function(event, d) {
                    selectCountry(d.country);
                });
        }

        //-------------------------------------------------
        //Line chart: selected country's trend over time
        //Life expectancy uses the left axis (full 2000-2025 history)
        //Health expenditure uses the right axis (2017-2025 only)
        //-------------------------------------------------
        function drawLineChart(country) {

            d3.select("#linechart").html("");

            //Pull out just this country's rows from each dataset
            var lifeSeries = [];
            for (var i = 0; i < lifeData.length; i++) {
                if (lifeData[i].country === country) {
                    lifeSeries.push(lifeData[i]);
                }
            }
            lifeSeries.sort(function(a, b) {
                return a.year - b.year;
            });

            var expSeries = [];
            for (var i = 0; i < expData.length; i++) {
                if (expData[i].country === country) {
                    expSeries.push(expData[i]);
                }
            }
            expSeries.sort(function(a, b) {
                return a.year - b.year;
            });

            //Width and height of SVG canvas
            var w = 1000;
            var h = 350;
            var padding = 65;

            var svg = d3.select("#linechart")
                .append("svg")
                .attr("viewBox", "0 0 " + w + " " + h);

            //x-axis covers the full range of years in the life expectancy data
            var yearMin = d3.min(lifeSeries, function(d) { return d.year; });
            var yearMax = d3.max(lifeSeries, function(d) { return d.year; });

            var xScale = d3.scaleLinear()
                .domain([yearMin, yearMax])
                .range([padding, w - padding]);

            //Left y-axis: life expectancy
            var lifeMin = d3.min(lifeSeries, function(d) { return d.life; });
            var lifeMax = d3.max(lifeSeries, function(d) { return d.life; });

            var yScaleLife = d3.scaleLinear()
                .domain([lifeMin, lifeMax])
                .range([h - padding, padding]);

            //Right y-axis: health expenditure
            var expMax = d3.max(expSeries, function(d) { return d.expenditure; });

            var yScaleExp = d3.scaleLinear()
                .domain([0, expMax])
                .range([h - padding, padding]);

            //Line generator for life expectancy
            var lifeLine = d3.line()
                .x(function(d) { return xScale(d.year); })
                .y(function(d) { return yScaleLife(d.life); });

            //Line generator for health expenditure
            var expLine = d3.line()
                .x(function(d) { return xScale(d.year); })
                .y(function(d) { return yScaleExp(d.expenditure); });

            //Draw the life expectancy line
            svg.append("path")
                .datum(lifeSeries)
                .attr("fill", "none")
                .attr("stroke", "steelblue")
                .attr("stroke-width", 2)
                .attr("d", lifeLine);

            //Draw the expenditure line
            svg.append("path")
                .datum(expSeries)
                .attr("fill", "none")
                .attr("stroke", "firebrick")
                .attr("stroke-width", 2)
                .attr("d", expLine);

            //Bottom x-axis (years) — plain numbers, no comma formatting
            var xAxis = d3.axisBottom(xScale)
                .tickFormat(function(d) {
                    return d;
                });

            svg.append("g")
                .attr("transform", "translate(0," + (h - padding) + ")")
                .call(xAxis);

            //Left y-axis (life expectancy)
            var yAxisLife = d3.axisLeft(yScaleLife);

            svg.append("g")
                .attr("transform", "translate(" + padding + ",0)")
                .call(yAxisLife);

            //Right y-axis (expenditure)
            var yAxisExp = d3.axisRight(yScaleExp)
                .tickFormat(function(d) {
                    return formatMoney(d);
                });

            svg.append("g")
                .attr("transform", "translate(" + (w - padding) + ",0)")
                .call(yAxisExp);

            //Axis titles
            svg.append("text")
                .attr("x", padding)
                .attr("y", padding - 20)
                .attr("font-size", "12px")
                .attr("fill", "steelblue")
                .text("Life expectancy");

            svg.append("text")
                .attr("x", w - padding - 110)
                .attr("y", padding - 20)
                .attr("font-size", "12px")
                .attr("fill", "firebrick")
                .text("Health expenditure");

            //Chart title
            svg.append("text")
                .attr("x", w / 2)
                .attr("y", 20)
                .attr("text-anchor", "middle")
                .attr("font-weight", "bold")
                .text(country);
        }

    });

});
