const margin = {
    top: 30,
    right: 30,
    bottom: 70,
    left: 80
};

const width = 750 - margin.left - margin.right;
const height = 500 - margin.top - margin.bottom;

// Scatterplot SVG
const svg = d3
    .select("#scatterplot")
    .append("svg")
    .attr(
        "viewBox",
        `0 0 ${width + margin.left + margin.right}
        ${height + margin.top + margin.bottom}`
    )
    .append("g")
    .attr(
        "transform",
        `translate(${margin.left}, ${margin.top})`
    );

// Tooltip
const tooltip = d3.select("#tooltip");

// Load data
d3.csv("data/health_data.csv").then(data => {

    // Convert strings to numbers
    data.forEach(d => {
        d.year = +d.year;
        d.life_expectancy = +d.life_expectancy;
        d.health_expenditure = +d.health_expenditure;
    });

    // Get unique years
    const years = [...new Set(data.map(d => d.year))]
        .sort((a, b) => a - b);

    // Get unique countries
    const countries = [...new Set(data.map(d => d.country))]
        .sort();

    // Populate year dropdown
    d3.select("#year-select")
        .selectAll("option")
        .data(years)
        .join("option")
        .attr("value", d => d)
        .text(d => d);

    // Default to latest year
    const latestYear = d3.max(years);

    d3.select("#year-select")
        .property("value", latestYear);

    // Populate country dropdown
    d3.select("#country-select")
        .selectAll("option.country")
        .data(countries)
        .join("option")
        .attr("class", "country")
        .attr("value", d => d)
        .text(d => d);

    // Scales
    const xScale = d3.scaleLinear()
        .domain([
            0,
            d3.max(data, d => d.health_expenditure)
        ])
        .nice()
        .range([0, width]);

    const yScale = d3.scaleLinear()
        .domain([
            d3.min(data, d => d.life_expectancy) - 1,
            d3.max(data, d => d.life_expectancy) + 1
        ])
        .nice()
        .range([height, 0]);

    // X axis
    svg.append("g")
        .attr(
            "transform",
            `translate(0, ${height})`
        )
        .call(
            d3.axisBottom(xScale)
                .tickFormat(d => `$${d3.format(",")(d)}`)
        );

    // Y axis
    svg.append("g")
        .call(d3.axisLeft(yScale));

    // X axis label
    svg.append("text")
        .attr("class", "axis-label")
        .attr("x", width / 2)
        .attr("y", height + 55)
        .attr("text-anchor", "middle")
        .text("Health expenditure per capita");

    // Y axis label
    svg.append("text")
        .attr("class", "axis-label")
        .attr(
            "transform",
            "rotate(-90)"
        )
        .attr("x", -height / 2)
        .attr("y", -55)
        .attr("text-anchor", "middle")
        .text("Life expectancy at birth (years)");

    function updateScatterplot(year) {

        const filteredData = data.filter(
            d => d.year === +year
        );

        svg.selectAll(".dot")
            .data(
                filteredData,
                d => d.country
            )
            .join(

                enter => enter
                    .append("circle")
                    .attr("class", "dot")
                    .attr("cx", d =>
                        xScale(d.health_expenditure)
                    )
                    .attr("cy", d =>
                        yScale(d.life_expectancy)
                    )
                    .attr("r", 6)
                    .on("mouseover", function(event, d) {

                        tooltip
                            .style("visibility", "visible")
                            .html(`
                                <strong>${d.country}</strong><br>
                                Year: ${d.year}<br>
                                Life expectancy:
                                ${d.life_expectancy} years<br>
                                Health expenditure:
                                $${d3.format(",.0f")(
                                    d.health_expenditure
                                )}
                            `);

                    })
                    .on("mousemove", function(event) {

                        tooltip
                            .style(
                                "left",
                                `${event.pageX + 15}px`
                            )
                            .style(
                                "top",
                                `${event.pageY + 15}px`
                            );

                    })
                    .on("mouseout", function() {

                        tooltip
                            .style(
                                "visibility",
                                "hidden"
                            );

                    })
                    .on("click", function(event, d) {

                        selectCountry(d.country, d.year);

                    }),

                update => update
                    .transition()
                    .duration(500)
                    .attr("cx", d =>
                        xScale(d.health_expenditure)
                    )
                    .attr("cy", d =>
                        yScale(d.life_expectancy)
                    ),

                exit => exit.remove()

            );
    }

    function selectCountry(country, year) {

        const selected = data.find(
            d =>
                d.country === country &&
                d.year === +year
        );

        if (!selected) return;

        d3.select("#country-name")
            .text(selected.country);

        d3.select("#life-value")
            .text(
                `${selected.life_expectancy} years`
            );

        d3.select("#spending-value")
            .text(
                `$${d3.format(",.0f")(
                    selected.health_expenditure
                )} per person`
            );

        d3.select("#country-select")
            .property("value", country);

        drawLineChart(country);
    }

    // Year dropdown
    d3.select("#year-select")
        .on("change", function() {

            const selectedYear = +this.value;

            updateScatterplot(selectedYear);

        });

    // Country dropdown
    d3.select("#country-select")
        .on("change", function() {

            if (this.value === "All") return;

            const selectedYear =
                +d3.select("#year-select")
                    .property("value");

            selectCountry(
                this.value,
                selectedYear
            );

        });

    updateScatterplot(latestYear);

    function drawLineChart(country) {

        const countryData = data
            .filter(d => d.country === country)
            .sort((a, b) => a.year - b.year);

        d3.select("#linechart")
            .selectAll("*")
            .remove();

        const lineWidth = 1000;
        const lineHeight = 350;

        const lineMargin = {
            top: 30,
            right: 40,
            bottom: 50,
            left: 70
        };

        const innerWidth =
            lineWidth -
            lineMargin.left -
            lineMargin.right;

        const innerHeight =
            lineHeight -
            lineMargin.top -
            lineMargin.bottom;

        const lineSvg = d3
            .select("#linechart")
            .append("svg")
            .attr(
                "viewBox",
                `0 0 ${lineWidth} ${lineHeight}`
            )
            .append("g")
            .attr(
                "transform",
                `translate(
                    ${lineMargin.left},
                    ${lineMargin.top}
                )`
            );

        const x = d3.scaleLinear()
            .domain(d3.extent(
                countryData,
                d => d.year
            ))
            .range([0, innerWidth]);

        const y = d3.scaleLinear()
            .domain([
                d3.min(
                    countryData,
                    d => d.life_expectancy
                ) - 1,

                d3.max(
                    countryData,
                    d => d.life_expectancy
                ) + 1
            ])
            .range([
                innerHeight,
                0
            ]);

        lineSvg
            .append("g")
            .attr(
                "transform",
                `translate(0, ${innerHeight})`
            )
            .call(
                d3.axisBottom(x)
                    .tickFormat(d3.format("d"))
            );

        lineSvg
            .append("g")
            .call(d3.axisLeft(y));

        const line = d3.line()
            .x(d => x(d.year))
            .y(d => y(d.life_expectancy));

        lineSvg
            .append("path")
            .datum(countryData)
            .attr("fill", "none")
            .attr("stroke", "currentColor")
            .attr("stroke-width", 2)
            .attr("d", line);

        lineSvg
            .selectAll(".trend-point")
            .data(countryData)
            .join("circle")
            .attr("class", "trend-point")
            .attr("cx", d => x(d.year))
            .attr(
                "cy",
                d => y(d.life_expectancy)
            )
            .attr("r", 4);
    }

});