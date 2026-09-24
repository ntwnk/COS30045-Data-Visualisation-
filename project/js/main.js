// ============================================================
// OECD Health & Spending Explorer
// Life Expectancy + Health Expenditure Per Capita (USD PPP)
// ============================================================


// ------------------------------------------------------------
// LOAD HEALTH EXPENDITURE PER CAPITA DATA
// ------------------------------------------------------------

d3.csv("data/health_expenditure.csv", function(d) {

    return {
        country: d.country,
        year: +d.year,
        expenditure: +d.expenditure_per_capita
    };

}).then(function(expData) {


    // --------------------------------------------------------
    // LOAD LIFE EXPECTANCY DATA
    // --------------------------------------------------------

    d3.csv("data/life_expectancy.csv", function(d) {

        return {
            country: d.country,
            year: +d.year,
            life: +d.life_expectancy
        };

    }).then(function(lifeData) {


        // ====================================================
        // MERGE DATASETS
        // Match using country + year
        // ====================================================

        var merged = [];

        for (var i = 0; i < lifeData.length; i++) {

            for (var j = 0; j < expData.length; j++) {

                if (
                    lifeData[i].country === expData[j].country &&
                    lifeData[i].year === expData[j].year
                ) {

                    merged.push({
                        country: lifeData[i].country,
                        year: lifeData[i].year,
                        life: lifeData[i].life,
                        expenditure: expData[j].expenditure
                    });

                    break;
                }
            }
        }


        // ====================================================
        // GET UNIQUE COUNTRIES
        // ====================================================

        var countries = [];

        for (var i = 0; i < merged.length; i++) {

            if (countries.indexOf(merged[i].country) === -1) {
                countries.push(merged[i].country);
            }
        }

        countries.sort();


        // ====================================================
        // GET UNIQUE YEARS
        // ====================================================

        var years = [];

        for (var i = 0; i < merged.length; i++) {

            if (years.indexOf(merged[i].year) === -1) {
                years.push(merged[i].year);
            }
        }

        years.sort(function(a, b) {
            return a - b;
        });


        // ====================================================
        // DEFAULT YEAR
        // Use the newest year with the most available data
        // ====================================================

        var defaultYear = years[years.length - 1];

        var highestCount = 0;

        for (var i = 0; i < years.length; i++) {

            var count = 0;

            for (var j = 0; j < merged.length; j++) {

                if (merged[j].year === years[i]) {
                    count++;
                }
            }

            if (count >= highestCount) {
                highestCount = count;
                defaultYear = years[i];
            }
        }


        // ====================================================
        // YEAR DROPDOWN
        // ====================================================

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


        // ====================================================
        // COUNTRY DROPDOWN
        // ====================================================

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


        // Set default year
        d3.select("#year-select")
            .property("value", defaultYear);


        // Starting message
        d3.select("#linechart")
            .html(
                "<p>Select a country above to see its trend over time.</p>"
            );


        // Draw initial scatterplot
        drawScatterplot(defaultYear);


        // ====================================================
        // YEAR DROPDOWN EVENT
        // ====================================================

        d3.select("#year-select")
            .on("change", function() {

                var year = +this.value;

                drawScatterplot(year);

                var country =
                    d3.select("#country-select").property("value");

                if (country !== "All") {
                    updateInfoCard(country, year);
                }
            });


        // ====================================================
        // COUNTRY DROPDOWN EVENT
        // ====================================================

        d3.select("#country-select")
            .on("change", function() {

                selectCountry(this.value);

            });


        // ====================================================
        // SELECT COUNTRY
        // ====================================================

        function selectCountry(country) {

            // Keep dropdown synced
            d3.select("#country-select")
                .property("value", country);

            var year =
                +d3.select("#year-select").property("value");


            if (country === "All") {

                d3.select("#country-name")
                    .text("Select a country");

                d3.select("#life-value")
                    .text("—");

                d3.select("#spending-value")
                    .text("—");

                d3.select("#linechart")
                    .html(
                        "<p>Select a country above to see its trend over time.</p>"
                    );

            } else {

                updateInfoCard(country, year);

                drawLineChart(country);
            }


            // Redraw scatterplot to highlight selected country
            drawScatterplot(year);
        }


        // ====================================================
        // UPDATE COUNTRY INFORMATION CARD
        // ====================================================

        function updateInfoCard(country, year) {

            var record = null;

            for (var i = 0; i < merged.length; i++) {

                if (
                    merged[i].country === country &&
                    merged[i].year === year
                ) {

                    record = merged[i];
                    break;
                }
            }


            d3.select("#country-name")
                .text(country);


            if (record) {

                d3.select("#life-value")
                    .text(record.life.toFixed(1) + " years");

                d3.select("#spending-value")
                    .text(formatMoney(record.expenditure));

            } else {

                d3.select("#life-value")
                    .text("No data for " + year);

                d3.select("#spending-value")
                    .text("No data for " + year);
            }
        }


        // ====================================================
        // FORMAT PER-CAPITA EXPENDITURE
        // Example: 7885 -> $7,885
        // ====================================================

        function formatMoney(value) {

            return "$" + d3.format(",.0f")(value);

        }


        // ====================================================
        // SCATTERPLOT
        // X = Health expenditure per capita (USD PPP)
        // Y = Life expectancy
        // ====================================================

        function drawScatterplot(year) {


            // Clear old chart
            d3.select("#scatterplot")
                .html("");


            // Filter selected year
            var data = [];

            for (var i = 0; i < merged.length; i++) {

                if (merged[i].year === year) {
                    data.push(merged[i]);
                }
            }


            var selectedCountry =
                d3.select("#country-select").property("value");


            // Chart dimensions
            var w = 600;
            var h = 400;
            var padding = 65;


            // SVG
            var svg = d3.select("#scatterplot")
                .append("svg")
                .attr("viewBox", "0 0 " + w + " " + h);


            // ------------------------------------------------
            // SCALE VALUES
            // ------------------------------------------------

            var expMax = d3.max(
                merged,
                function(d) {
                    return d.expenditure;
                }
            );


            var lifeMin = d3.min(
                merged,
                function(d) {
                    return d.life;
                }
            );


            var lifeMax = d3.max(
                merged,
                function(d) {
                    return d.life;
                }
            );


            // ------------------------------------------------
            // X SCALE
            // Linear because expenditure is now PER PERSON
            // ------------------------------------------------

            var xScale = d3.scaleLinear()
                .domain([0, expMax])
                .nice()
                .range([padding, w - padding]);


            // ------------------------------------------------
            // Y SCALE
            // ------------------------------------------------

            var yScale = d3.scaleLinear()
                .domain([lifeMin, lifeMax])
                .nice()
                .range([h - padding, padding]);


            // ------------------------------------------------
            // AXES
            // ------------------------------------------------

            var xAxis = d3.axisBottom(xScale)
                .ticks(5)
                .tickFormat(function(d) {

                    return "$" + d3.format(",.0f")(d);

                });


            var yAxis = d3.axisLeft(yScale);


            // X axis
            svg.append("g")
                .attr(
                    "transform",
                    "translate(0," + (h - padding) + ")"
                )
                .call(xAxis);


            // Y axis
            svg.append("g")
                .attr(
                    "transform",
                    "translate(" + padding + ",0)"
                )
                .call(yAxis);


            // ------------------------------------------------
            // AXIS LABELS
            // ------------------------------------------------

            svg.append("text")
                .attr("x", w / 2)
                .attr("y", h - 15)
                .attr("text-anchor", "middle")
                .attr("font-size", "12px")
                .text(
                    "Health expenditure per capita (USD PPP)"
                );


            svg.append("text")
                .attr("x", padding)
                .attr("y", padding - 15)
                .attr("font-size", "12px")
                .text(
                    "Life expectancy (years)"
                );


            // ------------------------------------------------
            // TOOLTIP
            // ------------------------------------------------

            var tooltip =
                d3.select("#tooltip");


            // ------------------------------------------------
            // COUNTRY DOTS
            // ------------------------------------------------

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


                // --------------------------------------------
                // MOUSE OVER
                // --------------------------------------------

                .on("mouseover", function(event, d) {

                    d3.select(this)
                        .transition()
                        .duration(200)
                        .attr("r", 9);


                    tooltip
                        .style("visibility", "visible")
                        .html(

                            "<strong>" +
                            d.country +
                            "</strong><br>" +

                            "Life expectancy: " +
                            d.life.toFixed(1) +
                            " years<br>" +

                            "Health expenditure per capita: " +
                            formatMoney(d.expenditure) +
                            " USD PPP"
                        );

                })


                // --------------------------------------------
                // MOUSE MOVE
                // --------------------------------------------

                .on("mousemove", function(event) {

                    tooltip
                        .style(
                            "top",
                            (event.pageY + 12) + "px"
                        )
                        .style(
                            "left",
                            (event.pageX + 12) + "px"
                        );

                })


                // --------------------------------------------
                // MOUSE OUT
                // --------------------------------------------

                .on("mouseout", function(event, d) {

                    var radius = 5;

                    if (d.country === selectedCountry) {
                        radius = 8;
                    }


                    d3.select(this)
                        .transition()
                        .duration(200)
                        .attr("r", radius);


                    tooltip
                        .style("visibility", "hidden");

                })


                // --------------------------------------------
                // CLICK COUNTRY
                // --------------------------------------------

                .on("click", function(event, d) {

                    selectCountry(d.country);

                });
        }


        // ====================================================
        // LINE CHART
        //
        // Left axis  = Life expectancy
        // Right axis = Health expenditure per capita
        // ====================================================

        function drawLineChart(country) {


            d3.select("#linechart")
                .html("");


            // ------------------------------------------------
            // LIFE EXPECTANCY SERIES
            // ------------------------------------------------

            var lifeSeries = [];

            for (var i = 0; i < lifeData.length; i++) {

                if (lifeData[i].country === country) {
                    lifeSeries.push(lifeData[i]);
                }
            }


            lifeSeries.sort(function(a, b) {
                return a.year - b.year;
            });


            // ------------------------------------------------
            // EXPENDITURE SERIES
            // ------------------------------------------------

            var expSeries = [];

            for (var i = 0; i < expData.length; i++) {

                if (expData[i].country === country) {
                    expSeries.push(expData[i]);
                }
            }


            expSeries.sort(function(a, b) {
                return a.year - b.year;
            });


            // ------------------------------------------------
            // CHART DIMENSIONS
            // ------------------------------------------------

            var w = 1000;
            var h = 350;
            var padding = 65;


            var svg = d3.select("#linechart")
                .append("svg")
                .attr(
                    "viewBox",
                    "0 0 " + w + " " + h
                );


            // ------------------------------------------------
            // X SCALE — YEAR
            // ------------------------------------------------

            var yearMin = d3.min(
                lifeSeries,
                function(d) {
                    return d.year;
                }
            );


            var yearMax = d3.max(
                lifeSeries,
                function(d) {
                    return d.year;
                }
            );


            var xScale = d3.scaleLinear()
                .domain([yearMin, yearMax])
                .range([padding, w - padding]);


            // ------------------------------------------------
            // LEFT Y SCALE — LIFE EXPECTANCY
            // ------------------------------------------------

            var lifeMin = d3.min(
                lifeSeries,
                function(d) {
                    return d.life;
                }
            );


            var lifeMax = d3.max(
                lifeSeries,
                function(d) {
                    return d.life;
                }
            );


            var yScaleLife = d3.scaleLinear()
                .domain([lifeMin, lifeMax])
                .nice()
                .range([h - padding, padding]);


            // ------------------------------------------------
            // RIGHT Y SCALE — EXPENDITURE PER CAPITA
            // ------------------------------------------------

            var expMax = d3.max(
                expSeries,
                function(d) {
                    return d.expenditure;
                }
            );


            var yScaleExp = d3.scaleLinear()
                .domain([0, expMax])
                .nice()
                .range([h - padding, padding]);


            // ------------------------------------------------
            // LINE GENERATORS
            // ------------------------------------------------

            var lifeLine = d3.line()

                .x(function(d) {
                    return xScale(d.year);
                })

                .y(function(d) {
                    return yScaleLife(d.life);
                });


            var expLine = d3.line()

                .x(function(d) {
                    return xScale(d.year);
                })

                .y(function(d) {
                    return yScaleExp(d.expenditure);
                });


            // ------------------------------------------------
            // DRAW LIFE EXPECTANCY LINE
            // ------------------------------------------------

            svg.append("path")
                .datum(lifeSeries)
                .attr("fill", "none")
                .attr("stroke", "steelblue")
                .attr("stroke-width", 2)
                .attr("d", lifeLine);


            // ------------------------------------------------
            // DRAW EXPENDITURE LINE
            // ------------------------------------------------

            svg.append("path")
                .datum(expSeries)
                .attr("fill", "none")
                .attr("stroke", "firebrick")
                .attr("stroke-width", 2)
                .attr("d", expLine);


            // ------------------------------------------------
            // X AXIS
            // ------------------------------------------------

            var xAxis = d3.axisBottom(xScale)
                .tickFormat(function(d) {
                    return d;
                });


            svg.append("g")
                .attr(
                    "transform",
                    "translate(0," + (h - padding) + ")"
                )
                .call(xAxis);


            // ------------------------------------------------
            // LEFT Y AXIS
            // ------------------------------------------------

            var yAxisLife =
                d3.axisLeft(yScaleLife);


            svg.append("g")
                .attr(
                    "transform",
                    "translate(" + padding + ",0)"
                )
                .call(yAxisLife);


            // ------------------------------------------------
            // RIGHT Y AXIS
            // ------------------------------------------------

            var yAxisExp = d3.axisRight(yScaleExp)

                .tickFormat(function(d) {

                    return "$" +
                        d3.format(",.0f")(d);

                });


            svg.append("g")
                .attr(
                    "transform",
                    "translate(" +
                    (w - padding) +
                    ",0)"
                )
                .call(yAxisExp);


            // ------------------------------------------------
            // LABELS
            // ------------------------------------------------

            svg.append("text")
                .attr("x", padding)
                .attr("y", padding - 20)
                .attr("font-size", "12px")
                .attr("fill", "steelblue")
                .text(
                    "Life expectancy (years)"
                );


            svg.append("text")
                .attr("x", w - padding - 190)
                .attr("y", padding - 20)
                .attr("font-size", "12px")
                .attr("fill", "firebrick")
                .text(
                    "Health expenditure per capita (USD PPP)"
                );


            // ------------------------------------------------
            // CHART TITLE
            // ------------------------------------------------

            svg.append("text")
                .attr("x", w / 2)
                .attr("y", 20)
                .attr("text-anchor", "middle")
                .attr("font-weight", "bold")
                .text(country);
        }


    }).catch(function(error) {

        console.error(
            "Error loading life expectancy data:",
            error
        );

    });


}).catch(function(error) {

    console.error(
        "Error loading health expenditure data:",
        error
    );

});