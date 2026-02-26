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
     */
    function createActionButton() {
        var $btn = $([
            '<div class="full-start__button selector">',
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
            Log.info('Button pressed');
            Lampa.Noty.show('нажата кнопка. плагин putilove');
        });

        return $btn;
    }

    // ─── Логика добавления кнопки ─────────────────────────────────────────────

    /**
     * Обработчик события 'full' — открытие детальной страницы карточки.
     */
    function onFullCard(e) {
        // 'complite' — намеренная опечатка в Lampa (complete -> complite)
        if (e.type !== 'complite') return;

        try {
            var $buttons = e.object.render().find('.full-start__buttons');

            if (!$buttons.length) {
                Log.warn('Кнопочная панель (.full-start__buttons) не найдена');
                return;
            }

            $buttons.append(createActionButton());
            Log.info('Кнопка добавлена на карточку: ' + (e.object.card && e.object.card.title || '—'));
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
