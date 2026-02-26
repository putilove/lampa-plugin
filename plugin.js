(function () {
    'use strict';

    function startPlugin() {
        window.plugin_mybutton_ready = true;
        console.log('plugin started');
        // HTML шаблон кнопки
        var button = `
            <div class="full-start__button view--mybutton" style="cursor: pointer;">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" viewBox="0 0 16 16">
                    <path d="M11 2a3 3 0 0 1 3 3v6a3 3 0 0 1-3 3H5a3 3 0 0 1-3-3V5a3 3 0 0 1 3-3zM5 1a4 4 0 0 0-4 4v6a4 4 0 0 0 4 4h6a4 4 0 0 0 4-4V5a4 4 0 0 0-4-4z"/>
                </svg>
                <span>Моя кнопка</span>
            </div>
        `;

        function add() {
            // Подписываемся на событие открытия страницы фильма
            Lampa.Listener.follow('full', function (e) {
                if (e.type == 'complite') {
                    try {
                        var btn = $(button);

                        // Обработчик нажатия кнопки
                        btn.on('hover:enter', function () {
                            var card = e.data.movie || e.data;
                            Lampa.Noty.show('Нажата кнопка для: ' + (card.title || card.name));
                        });

                        // Вставляем кнопку после последней кнопки в панели
                        if (e.data && e.object) {
                            e.object.activity.render()
                                .find('.full-start__button')
                                .last()
                                .after(btn);
                        }
                    } catch (error) {
                        console.error('[mybutton] Ошибка при добавлении кнопки:', error);
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