const d3 = window.d3;

const svg = d3.select('#map').append('svg');

const nobelPerCountry = d3.map();

// Colors range and domain
const domain = [0, 1, 2, 3, 4, 5, 7, 10, 20, 30, 60, 300];
const generator = d3.scaleLinear()
  .domain([0, (domain.length - 1) / 2, domain.length - 1])
  .range([
    d3.hsl(0.00, 0.00, 0.57),
    d3.hsl(0.55, 1.00, 0.50)])
  .interpolate(d3.interpolateCubehelix);

const range = d3.range(domain.length).map(generator);

const color = d3.scaleThreshold()
  .domain(domain)
  .range(range);

const projection = d3.geoEquirectangular();

const path = d3.geoPath().projection(projection);

const div = d3.select('body').append('div')
  .attr('class', 'maptooltip');

// Cross Filter dimension
const nobel = crossfilter(),
  perCountry = nobel.dimension(d => d.country),
  perCountries = perCountry.group(),
  perYear = nobel.dimension(d => d.year);

// Read Data
d3.queue()
  .defer(d3.json, './assets/topojson/world/countries.json')
  .defer(d3.csv, './data/out.csv', (d) => {
    for (const propertyName in d) {
      if (propertyName === 'id' || propertyName === 'year') {
        d[propertyName] = +d[propertyName];
      } else {
        continue;
      }
    }
    nobel.add([d]);
    nobelPerCountry.set(d.country, d.year);
  })
  .await(ready);

function ready(error, map) {
  svg.append('g')
    .attr('class', 'country')
    .selectAll('path')
    .data(topojson.feature(map, map.objects.units).features)
    .enter()
    .append('path')
    .attr('d', path)
    .style('opacity', 0.8);

  // Create the slider
  initSlider();

  function render() {
    const temp = perCountries.all().reduce((obj, c) => obj.set(c.key, c.value), d3.map());
    svg.attr('class', 'country')
      .selectAll('path')
      .attr('fill', (d) => {
        if (!temp.has(d.id) || temp.get(d.id) === 0) {
          return 'grey';
        }
        return color(temp.get(d.id));
      })
      // Tooltip
      .on('mouseover', function (d) {
        d3.select(this).transition().duration(300).style('opacity', 1);
        div.transition()
          .duration(200)
          .style('opacity', 1);
        div.html(`${d.id}<br/>${temp.has(d.id) ? temp.get(d.id) : '0'}`)
          .style('left', `${d3.event.pageX}px`)
          .style('top', `${d3.event.pageY - 28}px`);
      })
      .on('mouseout', function () {
        d3.select(this).transition().duration(300).style('opacity', 0.8);
        div.transition()
          .duration(500)
          .style('opacity', 0);
      });
  }

  function initSlider() {
    let values;
    const min = 1901;
    const max = 2017;
    const interval = [[1901, 1938], [1938, 1945], [1945, 1970],
      [1970, 2000], [2000, 2017], [1901, 2017]];
    let i = 0;
    const maxCarousel = 5;

    const slider = document.getElementById('sliderDouble');

    noUiSlider.create(slider, {
      start: interval[0],
      connect: true,
      range: {
        min,
        max,
      },
      pips: {
        mode: 'positions',
        values: [0, 25, 50, 75, 100],
        density: 3,
      },
      format: {
        to(value) {
          return Math.round(value);
        },
        from(value) {
          return Math.round(value);
        },
      },
      tooltips: [wNumb({ decimals: 0 }), wNumb({ decimals: 0 })],
      animate: true,
      animationDuration: 300,
    });

    // Update of map with slider data
    slider.noUiSlider.on('slide', () => {
      values = slider.noUiSlider.get();
      console.log(values);
      if (values[0] === values[1]) {
        perYear.filterExact(values[0]);
      } else {
        perYear.filterRange(values);
      }
      render();
    });

    // Carousel of text
    $('#DemoCarousel').bind('slide.bs.carousel', (e) => {
      if (e.direction === 'left') {
        i === maxCarousel ? i = 0 : i++;
      } else {
        i === 0 ? i = maxCarousel : i--;
      }

      // Setting slider Data with carousel
      slider.noUiSlider.set(interval[i]);
      perYear.filter(interval[i]);
      render();
    });

    // first render with first interval for stroy
    perYear.filter(interval[i]);
    render();
  }
}

