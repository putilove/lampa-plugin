/**
 * Плагин MyButton для Lampa
 * Добавляет кнопку на страницу фильма/сериала
 */

(function () {
    'use strict';

    function startPlugin() {
        window.plugin_mybutton_ready = true;

        // Добавляем перевод для текста кнопки
        Lampa.Lang.add({
            mybutton_title: {
                ru: 'Моя кнопка',
                en: 'My button',
                uk: 'Моя кнопка'
            }
        });

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
            Lampa.Noty.show('Нажата кнопка для: ' + (movie.title || movie.name));
        }

        function add() {
            Lampa.Listener.follow('full', function (e) {
                if (e.type == 'complite') {
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
                            }
                        }
                    } catch (error) {
                        console.error('[mybutton] Ошибка:', error);
                    }
                }
            });
        }

        if (window.appready) {
            add();
        } else {
            Lampa.Listener.follow('app', function (e) {
                if (e.type == 'ready') {
                    add();
                }
            });
        }
    }

    if (!window.plugin_mybutton_ready) {
        startPlugin();
    }

})();
