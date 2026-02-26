(function () {
    'use strict';

    // ─── Конфигурация ────────────────────────────────────────────────────────────
    var PLUGIN_NAME    = 'putilove';
    var PLUGIN_VERSION = '1.0.0';
    var COMPONENT_NAME = PLUGIN_NAME + '_online';

    // URL lampac-совместимого сервера. Можно изменить в настройках Lampa
    // или напрямую в этой строке на адрес своего сервера.
    var DEFAULT_API = 'http://89.110.85.48/';

    // ─── Логгер ──────────────────────────────────────────────────────────────────
    var Log = {
        tag:   '[' + PLUGIN_NAME + ' v' + PLUGIN_VERSION + ']',
        info:  function (msg) { console.log(this.tag,   msg); },
        warn:  function (msg) { console.warn(this.tag,  msg); },
        error: function (msg) { console.error(this.tag, msg); }
    };

    // ─── Шаблоны ─────────────────────────────────────────────────────────────────
    function addTemplates() {
        Lampa.Template.add(PLUGIN_NAME + '_loading',
            '<div class="online-empty">' +
                '<div class="broadcast__scan"><div></div></div>' +
            '</div>'
        );
    }

    // ─── Утилиты API ─────────────────────────────────────────────────────────────
    function apiBase() {
        var url = (Lampa.Storage.get(PLUGIN_NAME + '_api', '') || DEFAULT_API) + '';
        if (url.charAt(url.length - 1) !== '/') url += '/';
        return url;
    }

    function buildUrl(object, path) {
        var m   = object.movie;
        var q   = [];
        q.push('id='             + encodeURIComponent(m.id));
        q.push('title='          + encodeURIComponent(m.title || m.name || ''));
        q.push('original_title=' + encodeURIComponent(m.original_title || m.original_name || ''));
        q.push('serial='         + (m.name ? '1' : '0'));
        q.push('year='           + ((m.release_date || m.first_air_date || '0000') + '').slice(0, 4));
        q.push('source='         + (m.source || 'tmdb'));
        if (m.imdb_id)       q.push('imdb_id='       + encodeURIComponent(m.imdb_id));
        if (m.kinopoisk_id)  q.push('kinopoisk_id='  + encodeURIComponent(m.kinopoisk_id));
        var base = apiBase() + path;
        return base + (base.indexOf('?') >= 0 ? '&' : '?') + q.join('&');
    }

    // ─── Компонент онлайн-просмотра ───────────────────────────────────────────────
    //
    // Регистрируется как Lampa.Component.  Когда пользователь нажимает кнопку
    // на карточке, Lampa.Activity.push() открывает этот компонент.
    //
    // Структура UI:
    //   Lampa.Explorer          — обёртка с шапкой (Filter) и телом (Scroll)
    //   └─ Lampa.Filter         — кнопки «Балансер» и «Фильтр» (войс / сезон)
    //   └─ Lampa.Scroll         — прокручиваемый список файлов
    //
    function PutiComponent(object) {
        var _self   = this;
        var network = new Lampa.Reguest();
        var scroll  = new Lampa.Scroll({ mask: true, over: true });
        var files   = new Lampa.Explorer(object);
        var filter  = new Lampa.Filter(object);

        var sources        = {};   // { name: { url, name, show } }
        var filter_sources = [];   // упорядоченный массив ключей sources
        var balanser       = '';   // активный балансер
        var source         = '';   // URL активного балансера

        var filter_find = {
            season: [],  // [{title, url}]
            voice:  []   // [{title, url}]
        };

        // ── initialize ─────────────────────────────────────────────────────────
        // Вызывается один раз при создании активности.
        this.initialize = function () {
            this.loading(true);

            // Кнопка «назад» в фильтре
            if (filter.addButtonBack) filter.addButtonBack();

            filter.onBack     = function () { _self.start(); };
            filter.onSelect   = onFilterSelect;

            filter.render().find('.filter--sort span').text('Балансер');

            // Сборка DOM: Explorer = Filter (шапка) + Scroll (тело)
            scroll.body().addClass('torrent-list');
            files.appendFiles(scroll.render());
            files.appendHead(filter.render());
            scroll.minus(files.render().find('.explorer__files-head'));
            scroll.body().append(Lampa.Template.get(PLUGIN_NAME + '_loading'));

            this.loading(false);
            loadSources();
        };

        // ── Загрузка списка балансеров ─────────────────────────────────────────
        function loadSources() {
            var url = buildUrl(object, 'lite/events');
            Log.info('Загружаем балансеры: ' + url);

            network.timeout(12000);
            network.silent(url, function (json) {
                if (!json || !json.length) {
                    _self.doesNotAnswer('Пустой ответ от API');
                    return;
                }

                json.forEach(function (j) {
                    var key = (j.balanser || j.name.split(' ')[0]).toLowerCase();
                    sources[key] = { url: j.url, name: j.name, show: j.show !== false };
                });

                filter_sources = Lampa.Arrays.getKeys(sources);

                if (!filter_sources.length) {
                    _self.doesNotAnswer('Нет доступных балансеров');
                    return;
                }

                // Восстанавливаем последний выбранный балансер
                var saved = Lampa.Storage.get(PLUGIN_NAME + '_balanser', '');
                balanser  = (saved && sources[saved]) ? saved : filter_sources[0];
                if (!sources[balanser] || !sources[balanser].show) balanser = filter_sources[0];
                source = sources[balanser].url;

                Log.info('Активный балансер: ' + balanser + ' → ' + source);
                _self.doSearch();

            }, function (a, c) {
                _self.doesNotAnswer('HTTP ' + (c || 0));
            });
        }

        // ── Поиск / запросы ────────────────────────────────────────────────────
        this.doSearch = function () {
            updateFilterUI();
            this.doRequest(buildUrl(object, source));
        };

        this.doRequest = function (url) {
            Log.info('Запрос: ' + url);
            network.native(url, _self.parse.bind(_self), _self.doesNotAnswer.bind(_self), false, { dataType: 'text' });
        };

        // ── Парсинг HTML-ответа балансера ──────────────────────────────────────
        //
        // Балансер возвращает HTML с элементами:
        //   .videos__item[data-json]   — видео / серия / ссылка на уровень
        //   .videos__button[data-json] — кнопки войсов/переводов
        //
        this.parse = function (str) {
            try {
                var $doc    = $('<div>' + str + '</div>');
                var items   = parseElems($doc, '.videos__item');
                var buttons = parseElems($doc, '.videos__button');

                this.activity.loader(false);

                if (!items.length) {
                    this.doesNotAnswer('Нет элементов в ответе');
                    return;
                }

                // Ссылка-переход на следующий уровень (1 элемент типа link)
                if (items.length === 1 && items[0].method === 'link' && !items[0].similar) {
                    filter_find.season = [{ title: items[0].text, url: items[0].url }];
                    this.replaceChoice({ season: 0 });
                    this.doRequest(items[0].url);
                    return;
                }

                // Разделяем на воспроизводимые и навигационные (сезоны)
                var videos  = items.filter(function (v) { return v.method === 'play' || v.method === 'call'; });
                var seasons = items.filter(function (v) { return v.method !== 'play' && v.method !== 'call' && !v.similar; });

                if (!videos.length) {
                    // Показываем список сезонов — и следуем за сохранённым выбором
                    filter_find.season = seasons.map(function (s) { return { title: s.text, url: s.url }; });
                    var sSel = this.getChoice().season;
                    var sDst = filter_find.season[sSel] || filter_find.season[0];
                    this.doRequest(sDst.url);
                    return;
                }

                // Обработка кнопок перевода (войсов)
                if (buttons.length) {
                    filter_find.voice = buttons.map(function (b) { return { title: b.text, url: b.url }; });

                    var choice      = this.getChoice();
                    var byUrl       = buttons.find(function (b) { return b.url  === choice.voice_url;  });
                    var byName      = buttons.find(function (b) { return b.text === choice.voice_name; });
                    var activeBtn   = buttons.find(function (b) { return b.active; });

                    if (byUrl && !byUrl.active) {
                        this.replaceChoice({ voice: buttons.indexOf(byUrl), voice_name: byUrl.text });
                        this.doRequest(byUrl.url);
                        return;
                    }
                    if (byName && !byName.active) {
                        this.replaceChoice({ voice: buttons.indexOf(byName), voice_name: byName.text });
                        this.doRequest(byName.url);
                        return;
                    }
                    if (activeBtn) {
                        this.replaceChoice({ voice: buttons.indexOf(activeBtn), voice_name: activeBtn.text });
                    }
                } else {
                    this.replaceChoice({ voice: 0, voice_url: '', voice_name: '' });
                }

                this.displayVideos(videos);

            } catch (e) {
                Log.error('parse: ' + e);
                this.doesNotAnswer(e);
            }
        };

        // ── Отображение списка видео / серий ───────────────────────────────────
        this.displayVideos = function (videos) {
            var _s = this;

            this.draw(videos, {
                onEnter: function (item) {
                    resolveUrl(item, function (json) {
                        if (!json || !json.url) {
                            Lampa.Noty.show('Не удалось получить ссылку на видео');
                            return;
                        }

                        var first    = makePlayObj(item, json);
                        var playlist = buildPlaylist(videos, item, json);
                        if (playlist.length > 1) first.playlist = playlist;

                        Lampa.Player.play(first);
                        Lampa.Player.playlist(playlist);
                        if (item.mark) item.mark();
                    });
                },
                onContextMenu: function (item, html, data, call) {
                    resolveUrl(item, function (json) {
                        call({ file: json ? json.url : '', quality: item.qualitys });
                    });
                }
            });

            updateFilterUI();
        };

        // ── Обработка выбора в фильтре ─────────────────────────────────────────
        function onFilterSelect(type, a, b) {
            if (type === 'filter') {
                if (a.reset) {
                    // Сброс выбора сезона / войса
                    _self.replaceChoice({ season: 0, voice: 0, voice_name: '', voice_url: '' });
                    setTimeout(function () { Lampa.Select.close(); Lampa.Activity.replace(); }, 10);
                } else {
                    var url    = filter_find[a.stype][b.index].url;
                    var choice = _self.getChoice();
                    if (a.stype === 'voice') {
                        choice.voice_name = filter_find.voice[b.index].title;
                        choice.voice_url  = url;
                    }
                    choice[a.stype] = b.index;
                    _self.saveChoice(choice);
                    _self.resetScroll();
                    _self.doRequest(url);
                    setTimeout(Lampa.Select.close, 10);
                }
            } else if (type === 'sort') {
                // Смена балансера
                Lampa.Select.close();
                balanser = a.source;
                source   = sources[balanser].url;
                Lampa.Storage.set(PLUGIN_NAME + '_balanser', balanser);
                Lampa.Activity.replace();
            }
        }

        // ── Обновление UI фильтра ──────────────────────────────────────────────
        function updateFilterUI() {
            var choice  = _self.getChoice();
            var select  = [{ title: Lampa.Lang.translate('torrent_parser_reset'), reset: true }];
            var chosen  = [];

            if (filter_find.voice.length) {
                var curVoice = filter_find.voice[choice.voice] || {};
                select.push({
                    title:    Lampa.Lang.translate('torrent_parser_voice'),
                    subtitle: curVoice.title || '',
                    stype:    'voice',
                    items:    filter_find.voice.map(function (v, i) {
                        return { title: v.title, selected: choice.voice === i, index: i, stype: 'voice' };
                    })
                });
                if (curVoice.title) chosen.push(Lampa.Lang.translate('torrent_parser_voice') + ': ' + curVoice.title);
            }

            if (filter_find.season.length > 1) {
                var curSeason = filter_find.season[choice.season] || {};
                select.push({
                    title:    Lampa.Lang.translate('torrent_serial_season'),
                    subtitle: curSeason.title || '',
                    stype:    'season',
                    items:    filter_find.season.map(function (s, i) {
                        return { title: s.title, selected: choice.season === i, index: i, stype: 'season' };
                    })
                });
                if (curSeason.title) chosen.push(Lampa.Lang.translate('torrent_serial_season') + ': ' + curSeason.title);
            }

            filter.set('filter', select);
            filter.set('sort', filter_sources.map(function (name) {
                return {
                    title:    sources[name].name,
                    source:   name,
                    selected: name === balanser,
                    ghost:    !sources[name].show
                };
            }));

            filter.chosen('filter', chosen);
            filter.chosen('sort', [sources[balanser] ? sources[balanser].name : balanser]);
        }

        // ── Сохранение выбора (сезон / войс) между сессиями ───────────────────
        this.getChoice = function () {
            var data = Lampa.Storage.cache(PLUGIN_NAME + '_choice_' + balanser, 3000, {});
            var save = data[object.movie.id] || {};
            Lampa.Arrays.extend(save, { season: 0, voice: 0, voice_name: '', voice_url: '' });
            return save;
        };

        this.saveChoice = function (choice) {
            var data         = Lampa.Storage.cache(PLUGIN_NAME + '_choice_' + balanser, 3000, {});
            data[object.movie.id] = choice;
            Lampa.Storage.set(PLUGIN_NAME + '_choice_' + balanser, data);
        };

        this.replaceChoice = function (patch) {
            var c = this.getChoice();
            Lampa.Arrays.extend(c, patch, true);
            this.saveChoice(c);
        };

        // ── Жизненный цикл компонента ──────────────────────────────────────────
        // create() вызывается Lampa в контексте ActivitySlide (this — не компонент),
        // поэтому используем замкнутую переменную files вместо this.render().
        this.render  = function () { return files.render(); };
        this.create  = function () { return files.render(); };    // НЕ this.render()
        this.start   = function () { Lampa.Controller.enable('content'); };
        this.stop    = function () {};

        this.loading = function (status) {
            if (status) this.activity.loader(true);
            else        { this.activity.loader(false); this.activity.toggle(); }
        };

        this.resetScroll = function () {
            network.clear();
            scroll.render().find('.empty').remove();
            scroll.clear();
            scroll.reset();
            scroll.body().append(Lampa.Template.get(PLUGIN_NAME + '_loading'));
        };

        this.empty = function () {
            scroll.clear();
            var $empty = $('<div class="empty"><div class="empty__title">Ничего не найдено</div></div>');
            scroll.append($empty);
            Lampa.Controller.enable('content');
        };

        this.doesNotAnswer = function (reason) {
            Log.warn('doesNotAnswer: ' + reason);
            this.empty();
        };

        this.destroy = function () {
            network.clear();
            scroll.destroy();
            files.destroy();
            filter.destroy();
        };

        // ── Вспомогательные функции ────────────────────────────────────────────

        // Парсим элементы ответа балансера: data-json + атрибуты s/e
        function parseElems($doc, sel) {
            var result = [];
            $doc.find(sel).each(function () {
                try {
                    var $el   = $(this);
                    var data  = JSON.parse($el.attr('data-json') || '{}');
                    var s     = $el.attr('s');
                    var ep    = $el.attr('e');
                    if (ep) data.episode = parseInt(ep, 10);
                    if (s)  data.season  = parseInt(s,  10);
                    data.text   = $el.text().trim();
                    data.active = $el.hasClass('active');
                    result.push(data);
                } catch (e) { /* пропускаем битый элемент */ }
            });
            return result;
        }

        // Получаем реальную ссылку на поток (может требовать доп. запроса)
        function resolveUrl(file, cb) {
            if (file.method === 'play' || file.url && file.url.indexOf('://') >= 0) {
                cb(file);
                return;
            }
            Lampa.Loading.start(function () { Lampa.Loading.stop(); network.clear(); });
            network.native(file.url, function (json) {
                Lampa.Loading.stop();
                cb(json && json.url ? json : false);
            }, function () {
                Lampa.Loading.stop();
                cb(false);
            });
        }

        // Строим объект для Lampa.Player.play()
        function makePlayObj(item, json) {
            return {
                title:     item.title || item.text,
                url:       json.url,
                quality:   json.quality || item.qualitys,
                subtitles: json.subtitles,
                timeline:  item.timeline,
                season:    item.season,
                episode:   item.episode,
                callback:  item.mark
            };
        }

        // Строим плейлист для сериала (остальные серии загружаются лениво)
        function buildPlaylist(videos, current, json) {
            if (!current.season) return [makePlayObj(current, json)];

            return videos.map(function (v) {
                var el = makePlayObj(v, v === current ? json : v);
                if (v !== current && v.method !== 'play') {
                    el.url = function (call) {
                        resolveUrl(v, function (r) {
                            el.url = r ? r.url : '';
                            if (r && r.quality) el.quality = r.quality;
                            call();
                        });
                    };
                }
                return el;
            });
        }
    }

    // ─── Кнопка на карточке фильма / сериала ─────────────────────────────────────
    function addCardButton(params) {
        // Защита от дублирования
        if (params.render.closest('.full-start__buttons').find('.putilove--button').length) return;

        var title = (params.movie && params.movie.title) || '—';

        var $btn = $(
            '<div class="full-start__button selector putilove--button">' +
                '<div style="' +
                    'width:52px;height:52px;' +
                    'background:#e62828;' +
                    'border-radius:50%;' +
                    'margin:0 auto 8px;' +
                    'box-shadow:0 0 12px rgba(230,40,40,.7);' +
                '"></div>' +
                '<div class="full-start__button-name">Putilove</div>' +
            '</div>'
        );

        $btn.on('hover:enter', function () {
            Log.info('Открываем онлайн: ' + title);
            Lampa.Activity.push({
                url:        '',
                title:      Lampa.Lang.translate('title_online'),
                component:  COMPONENT_NAME,
                search:     params.movie.title     || params.movie.name          || '',
                search_two: params.movie.original_title || params.movie.original_name || '',
                movie:      params.movie,
                page:       1
            });
        });

        params.render.before($btn);
        Log.info('Кнопка добавлена: ' + title);
    }

    // ─── Инициализация ────────────────────────────────────────────────────────────
    function init() {
        Log.info('Инициализация');

        addTemplates();

        // Регистрируем компонент в Lampa
        Lampa.Component.add(COMPONENT_NAME, PutiComponent);

        // Подписываемся на открытие карточки
        Lampa.Listener.follow('full', function (e) {
            if (e.type !== 'complite') return;
            try {
                addCardButton({
                    render: e.object.activity.render().find('.button--play'),
                    movie:  e.data.movie
                });
            } catch (err) {
                Log.error('Ошибка при добавлении кнопки: ' + err);
            }
        });

        Log.info('Готов');
    }

    // ─── Запуск ───────────────────────────────────────────────────────────────────
    if (window.appready) {
        init();
    } else {
        Lampa.Listener.follow('app', function (e) {
            if (e.type === 'ready') init();
        });
    }

    // Маркер для внешней проверки загрузки плагина
    window['plugin_' + PLUGIN_NAME] = {
        name:      PLUGIN_NAME,
        version:   PLUGIN_VERSION,
        component: COMPONENT_NAME
    };

})();
