(function() {

    var life = {
        $title: document.getElementById('title'),
        $el: document.getElementById('life'),


        utils: {
            extend: function(object) {
                var args = Array.prototype.slice.call(arguments, 1),
                    source;

                while (args.length > 0) {
                    source = args.shift();
                    if (!source) {
                        continue;
                    }

                    for (var property in source) {
                        object[property] = source[property];
                    }
                }

                return object;
            }
        },


        config: {
            yearLength: 120, // 120px per year
            hideAge: false, // Hide age from year axis
        },


        start: function() {
            life.loadConfig(function(config) {
                life.config = life.utils.extend(life.config, config);

                life.fetch(function(response) {
                    var data = life.parse(response);
                    var title = life.parseTitle(response);
                    life.render(title, data);

                    var scroll = function(event) {
                        var delta = event.wheelDelta / 10;
                        life.config.yearLength += delta;
                        life.config.yearLength = Math.max(life.config.yearLength, 1);
                        life.render(title, data);
                    }

                    if (document.addEventListener) {
                        // IE9, Chrome, Safari, Opera
                        document.addEventListener("mousewheel", scroll, false);
                        // Firefox
                        document.addEventListener("DOMMouseScroll", scroll, false);
                    } else {
                        // IE 6/7/8
                        document.attachEvent("onmousewheel", scroll);
                    }
                });
            });
        },


        loadConfig: function(fn) {
            var xhr = new XMLHttpRequest();
            xhr.open('GET', 'config.json', true);
            xhr.onload = function() {
                if (xhr.status == 200) {
                    fn(JSON.parse(xhr.responseText));
                } else {
                    fn({});
                }
            };
            xhr.onerror = xhr.onabort = function() {
                fn({});
            };
            xhr.send();
        },


        fetch: function(fn) {
            var xhr = new XMLHttpRequest();
            xhr.open('GET', 'timeline.md', true);
            xhr.onload = function() {
                if (xhr.status == 200) fn(xhr.responseText);
            };
            xhr.send();
        },


        parse: function(response) {
            var list = response.match(/\-\s+[^\n\r]+/ig);
            var data = [];
            list.forEach(function(l) {
                var matches = l.match(/\-\s+([\d\/\-\~\BCE]+)\s(.*)/i);
                var time = matches[1];
                var text = matches[2];
                data.push({
                    time: life.parseTime(time),
                    text: text
                });
            });
            return data;
        },


        parseTitle: function(response) {
            return response.match(/[^\r\n]+/i)[0];
        },


        parseTime: function(time, point) {
            point = point || 'start';
            var data, t;

            data = {
                title: time
            };

            // ~YYYY
            if (/^\~\d+$/.test(time)) {
                data = {
                    startYear: parseInt(time.slice(1), 10),
                    estimate: true
                };

                return data;
            }

            // YYYYBCE
            if (/^\d+BCE$/.test(time)) {
                data[point + 'Year'] = -(parseInt(time, 10));
                return data;
            }

            // YYYY
            if (/^\d+$/.test(time)) {
                data[point + 'Year'] = parseInt(time, 10);
                return data;
            }

            // MM/YYYY
            if (/^\d+\/\d+$/.test(time)) {
                t = time.split('/');
                data[point + 'Month'] = parseInt(t[0], 10);
                data[point + 'Year'] = parseInt(t[1], 10);
                return data;
            }

            // DD/MM/YYYY
            if (/^\d+\/\d+\/\d+$/.test(time)) {
                t = time.split('/');
                data[point + 'Date'] = parseInt(t[0], 10);
                data[point + 'Month'] = parseInt(t[1], 10);
                data[point + 'Year'] = parseInt(t[2], 10);
                return data;
            }

            // TIME-TIME
            if (/\-/.test(time)) {
                var splitTime = time.split('-'),
                    startTime = life.parseTime(splitTime[0]),
                    endTime = life.parseTime(splitTime[1], 'end'),
                    k;

                for (k in startTime) {
                    data[k] = startTime[k];
                }

                for (k in endTime) {
                    data[k] = endTime[k];
                }

                return data;
            }

            // NOW
            if (time == '~') {
                var now = new Date();
                data.endYear = now.getFullYear();
                data.endMonth = now.getMonth()+1;
                data.endDate = now.getDate();
                return data;
            }

            return data;
        },


        firstYear: null,
        renderEvent: function(d) {
            var firstYear = life.firstYear;
            var yearLength = life.config.yearLength;
            var monthLength = yearLength/12;
            var dayLength = monthLength/30;

            var time = d.time;
            var estimate = time.estimate;
            var startYear = time.startYear;
            var startMonth = time.startMonth;
            var startDate = time.startDate;
            var endYear = time.endYear;
            var endMonth = time.endMonth;
            var endDate = time.endDate;
            var width = 0;

            // Calculate offset
            var startTime = new Date(firstYear, 0, 1);
            var endTime = new Date(startYear, startMonth ? startMonth-1 : 0, startDate || 1);
            var daysDiff = (endTime - startTime)/(24*60*60*1000);
            offset = daysDiff*dayLength;

            // Calculate width
            if (endYear) {
                var _endMonth = endMonth ? endMonth-1 : 11;
                var _endDate = endDate || new Date(endYear, _endMonth+1, 0).getDate();
                startTime = new Date(startYear, startMonth ? startMonth-1 : 0, startDate || 1);
                endTime = new Date(endYear, _endMonth, _endDate);
                daysDiff = (endTime - startTime)/(24*60*60*1000);
                width = daysDiff*dayLength;
            } else {
                if (startDate) {
                    width = dayLength;
                } else if (startMonth) {
                    width = monthLength;
                } else {
                    width = yearLength;
                }
            }

            // Parse Markdown links in the text
            // credit: http://stackoverflow.com/a/9268827
            var link = null;
            while (!!(link = d.text.match(/\[([^\]]+)\]\(([^)"]+)(?: \"([^\"]+)\")?\)/))) {
                var link_attr = "";
                if (link[3] !== undefined) {
                    link_attr = " title='" + link[3] + "'";
                }
                d.text = d.text.replace(link[0], "<a href='" + link[2] + "'" + link_attr + ">" + link[1] + "</a>");
            }

            var html = '<div class="event" style="margin-left: ' + offset.toFixed(2) + 'px">';
            html += '<div class="time" style="width: ' + width.toFixed(2) + 'px"></div>';
            html += '<b>' + d.time.title + '</b> ' + d.text + '&nbsp;&nbsp;';
            html += '</div>';
            return html;
        },


        renderYears: function(firstYear, lastYear) {
            var dayLength = life.config.yearLength/12/30;
            var html = '';
            var days = 0;
            var hideAge = life.config.hideAge;

            for (var y = firstYear, age = 0; y <= lastYear + 1; y++, age++) {
                html += '<section class="year" style="left: ' + (days * dayLength).toFixed(2) + 'px">';
                html += y + (hideAge ? '' : (' (' + age + ')'));
                html += '</section>';
                days += (y % 4 === 0) ? 366 : 365;
            }
            return html;
        },


        render: function(title, data) {
            document.title = title;
            life.$title.innerHTML = title;

            // Get the first and last year for the year axis
            var firstYear = new Date().getFullYear();
            var lastYear = firstYear;
            data.forEach(function(d) {
                var time = d.time;
                var startYear = time.startYear;
                var endYear = time.endYear;
                if (startYear && startYear < firstYear) firstYear = startYear;
                if (endYear && endYear > lastYear) lastYear = endYear;
            });
            life.firstYear = firstYear;

            var html = life.renderYears(firstYear, lastYear);
            data.forEach(function(d) {
                html += life.renderEvent(d);
            });
            life.$el.innerHTML = html;

            var numYears = lastYear - firstYear,
                width = numYears * life.config.yearLength;
            life.$el.style.width = width + "px";
        }
    };


    var slider = {
        startingMousePostition: {},
        startingPagePosition: {},


        init: function() {
            window.addEventListener('mousedown', function(event) {
                slider.startingMousePostition = {
                    x: event.clientX,
                    y: event.clientY
                };
                slider.startingPagePosition = {
                    x: window.pageXOffset,
                    y: window.pageYOffset
                };
                window.addEventListener('mousemove', slider.slide);
            });
            window.addEventListener('mouseup', function(event) {
                window.removeEventListener('mousemove', slider.slide);
            });
        },


        slide: function(event) {
            event.preventDefault();
            var x = slider.startingPagePosition.x + (slider.startingMousePostition.x - event.clientX);
            var y = slider.startingPagePosition.y + (slider.startingMousePostition.y - event.clientY);
            window.scrollTo(x, y);
        }
    };


    life.start();
    slider.init();

}());
