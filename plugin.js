(function () {
    'use strict';

    // ─── Manifest ────────────────────────────────────────────────────────────────
    var PLUGIN_NAME    = 'putilove';
    var PLUGIN_VERSION = '1.0.0';
    var PLUGIN_AUTHOR  = 'putilove';

    // ─── Logger ──────────────────────────────────────────────────────────────────
    var Log = {
        tag: '[' + PLUGIN_NAME + ' v' + PLUGIN_VERSION + ']',
        info:  function (msg) { console.log(this.tag,  msg); },
        warn:  function (msg) { console.warn(this.tag, msg); },
        error: function (msg) { console.error(this.tag, msg); }
    };

    // ─── UI ──────────────────────────────────────────────────────────────────────

    /**
     * Строит кнопку для панели действий на странице фильма/сериала.
     * Иконка — красный круг; при нажатии выводится уведомление.
     * @param {Object} movie — объект карточки (e.data.movie)
     */
    function createActionButton(movie) {
        var $btn = $([
            '<div class="full-start__button selector putilove--button">',
                '<div style="',
                    'width:52px;height:52px;',
                    'background:#e62828;',
                    'border-radius:50%;',
                    'margin:0 auto 8px;',
                    'box-shadow:0 0 12px rgba(230,40,40,.7);',
                '"></div>',
                '<div class="full-start__button-name">Putilove</div>',
            '</div>'
        ].join(''));

        // Клик / Enter на пульте
        $btn.on('hover:enter', function () {
            Log.info('Button pressed — ' + ((movie && movie.title) || '—'));
            Lampa.Noty.show('нажата кнопка. плагин putilove');
        });

        return $btn;
    }

    // ─── Логика добавления кнопки ─────────────────────────────────────────────

    /**
     * Добавляет кнопку на страницу карточки.
     * params.render — jQuery-элемент (.button--play), перед которым вставляем кнопку.
     * params.movie  — объект карточки.
     */
    function addButton(params) {
        // Защита от дублирования
        if (params.render.closest('.full-start__buttons').find('.putilove--button').length) return;

        var $btn = createActionButton(params.movie);
        params.render.before($btn);
        Log.info('Кнопка добавлена: ' + ((params.movie && params.movie.title) || '—'));
    }

    /**
     * Обработчик события 'full' — открытие детальной страницы карточки.
     */
    function onFullCard(e) {
        // 'complite' — намеренная опечатка в Lampa (complete -> complite)
        if (e.type !== 'complite') return;

        try {
            addButton({
                render: e.object.activity.render().find('.button--play'),
                movie:  e.data.movie
            });
        } catch (err) {
            Log.error('Ошибка при добавлении кнопки: ' + err);
        }
    }

    // ─── Инициализация ────────────────────────────────────────────────────────

    function init() {
        Log.info('Инициализация плагина');
        Lampa.Listener.follow('full', onFullCard);
        Log.info('Готов. Слежу за событием full');
    }

    // ─── Регистрация плагина ──────────────────────────────────────────────────
    // Lampa выставляет window.appready = true, если приложение уже запущено.
    // Если нет — ждём событие app:ready.

    if (window.appready) {
        init();
    } else {
        Lampa.Listener.follow('app', function (e) {
            if (e.type === 'ready') init();
        });
    }

    // Маркер, по которому Lampa / другие плагины могут проверить загрузку
    window['plugin_' + PLUGIN_NAME] = {
        name:    PLUGIN_NAME,
        version: PLUGIN_VERSION,
        author:  PLUGIN_AUTHOR
    };

})();
