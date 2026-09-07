# COS30045-Data-Visualisation-

# OECD Health & Spending Explorer

An interactive data visualisation project exploring the relationship between **health expenditure per capita** and **life expectancy at birth** across OECD countries.

The project uses OECD Health Statistics and is being developed as a group data visualisation project using **D3.js**.

## Project Aim

The aim of this project is to help users explore how healthcare spending relates to population health outcomes across OECD countries.

The visualisation is intended to support questions such as:

- Which OECD countries have the highest and lowest life expectancy?
- Which countries spend the most on healthcare per person?
- Is higher health expenditure associated with higher life expectancy?
- Which countries achieve relatively high life expectancy with moderate expenditure?
- How have life expectancy and health expenditure changed over time?
- How does a selected country compare with other OECD countries?

## Data Sources

### Life Expectancy at Birth

Source: OECD Health Statistics

Dataset focus:
- Annual life expectancy at birth by country
- OECD countries
- Approximate period: 2000–2024, depending on available data

### Health Expenditure Per Capita

Source: OECD Health Statistics / Health Expenditure and Financing

Dataset focus:
- Annual health expenditure per person
- OECD countries
- Health expenditure per capita, preferably using PPP-adjusted values
- Approximate period: 2000–2024, depending on available data

The final project will use years and countries available in both datasets where required for combined visualisations.

## Proposed Visualisation

The current proposed design uses coordinated visualisations.

### 1. Scatter Plot

The main scatter plot will show:

- **X-axis:** Health expenditure per capita
- **Y-axis:** Life expectancy at birth
- **Point:** OECD country
- **Year filter:** Select a year
- **Tooltip:** Display country name and exact values

This view will allow users to investigate the relationship between healthcare spending and life expectancy.

### 2. Country Trend Chart

When a country is selected, a line chart will display changes over time.

Possible variables include:

- Life expectancy
- Health expenditure per capita
- OECD average comparison

### 3. Country Information Panel

A selected country may also display summary information such as:

- Current life expectancy
- Current health expenditure
- Difference from OECD average

## Planned Interactions

Possible interactions include:

- Hover tooltips
- Country selection
- Year filtering
- Country dropdown
- Linked highlighting between charts
- OECD average reference lines
- Responsive layout

## Project Structure

```text
project/
│
├── index.html
├── style.css
├── README.md
│
├── js/
│   └── main.js
│
└── data/
    └── health_data.csv
