(function () {
    'use strict';

    function startPlugin() {
        window.plugin_mybutton_ready = true;

        var button_html = '\
            <div class="full-start__button selector view--mybutton">\
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" viewBox="0 0 16 16">\
                    <path d="M11 2a3 3 0 0 1 3 3v6a3 3 0 0 1-3 3H5a3 3 0 0 1-3-3V5a3 3 0 0 1 3-3zM5 1a4 4 0 0 0-4 4v6a4 4 0 0 0 4 4h6a4 4 0 0 0 4-4V5a4 4 0 0 0-4-4z"/>\
                </svg>\
                <span>Моя кнопка</span>\
            </div>\
        ';

        function add() {
            Lampa.Listener.follow('full', function (e) {
                if (e.type == 'complite') {
                    try {
                        var btn = $(button_html);

                        btn.on('hover:enter', function () {
                            var movie = e.data.movie || e.data;
                            Lampa.Noty.show('Нажата кнопка для: ' + (movie.title || movie.name));
                        });

                        // Ключевое отличие: правильный способ получить render()
                        var render = e.object.activity.render();
                        var buttons = render.find('.full-start__buttons');

                        if (buttons.length) {
                            // Если есть контейнер кнопок — добавляем в него
                            buttons.append(btn);
                        } else {
                            // Fallback: ищем любую кнопку и вставляем после неё
                            render.find('.full-start__button').last().after(btn);
                        }

                        // Регистрируем кнопку в навигации Lampa
                        Lampa.Controller.enable('full');

                    } catch (error) {
                        console.error('[mybutton]', error);
                    }
                }
            });
        }

        if (window.appready) add();
        else {
            Lampa.Listener.follow('app', function (e) {
                if (e.type == 'ready') add();
            });
        }
    }

    if (!window.plugin_mybutton_ready) startPlugin();

})();
