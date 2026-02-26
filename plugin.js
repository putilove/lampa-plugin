/**
 * Плагин MyButton для Lampa
 * Добавляет кнопку на страницу фильма/сериала
 */

(function () {
    'use strict';

    var PLUGIN_NAME = 'mybutton';
    var PLUGIN_VERSION = '1.0.0';

    function log(msg) {
        console.log('[' + PLUGIN_NAME + '] ' + msg);
    }

    function startPlugin() {
        log('Инициализация плагина v' + PLUGIN_VERSION);

        window.plugin_mybutton_ready = true;

        // Добавляем перевод для текста кнопки
        Lampa.Lang.add({
            mybutton_title: {
                ru: 'Моя кнопка',
                en: 'My button',
                uk: 'Моя кнопка'
            }
        });

        log('Переводы зарегистрированы');

        var button = `
            <div class="full-start__button view--mybutton selector">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" viewBox="0 0 16 16">
                    <path d="M11 2a3 3 0 0 1 3 3v6a3 3 0 0 1-3 3H5a3 3 0 0 1-3-3V5a3 3 0 0 1 3-3zM5 1a4 4 0 0 0-4 4v6a4 4 0 0 0 4 4h6a4 4 0 0 0 4-4V5a4 4 0 0 0-4-4z"/>
                </svg>
                <span>#{mybutton_title}</span>
            </div>
        `;

        function handleButtonClick(data) {
            var movie = data.movie || data;
            var title = movie.title || movie.name || 'Unknown';
            log('Кнопка нажата для: ' + title);
            Lampa.Noty.show('Нажата кнопка для: ' + title);
        }

        function add() {
            log('Подписка на события full...');

            Lampa.Listener.follow('full', function (e) {
                if (e.type == 'complite') {
                    log('Страница фильма загружена, добавляем кнопку...');

                    try {
                        var btn = $(Lampa.Lang.translate(button));

                        btn.on('hover:enter', function () {
                            handleButtonClick(e.data);
                        });

                        if (e.data && e.object) {
                            var render = e.object.activity.render();
                            var existing = render.find('.full-start__button').last();

                            if (existing.length) {
                                existing.after(btn);
                                log('Кнопка успешно добавлена');
                            } else {
                                log('WARN: Не найдены кнопки .full-start__button на странице');
                            }
                        } else {
                            log('WARN: e.data или e.object недоступны');
                        }
                    } catch (error) {
                        console.error('[' + PLUGIN_NAME + '] Ошибка при добавлении кнопки:', error);
                    }
                }
            });

            log('Плагин готов к работе ✓');
        }

        if (window.appready) {
            log('Приложение уже готово, запускаем напрямую');
            add();
        } else {
            log('Ожидание готовности приложения...');
            Lampa.Listener.follow('app', function (e) {
                if (e.type == 'ready') {
                    log('Приложение готово, запускаем');
                    add();
                }
            });
        }
    }

    if (!window.plugin_mybutton_ready) {
        startPlugin();
    } else {
        console.warn('[' + PLUGIN_NAME + '] Плагин уже загружен, пропускаем инициализацию');
    }

})();
