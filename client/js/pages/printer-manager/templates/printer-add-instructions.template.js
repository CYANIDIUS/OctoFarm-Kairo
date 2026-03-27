export function createPrinterAddInstructions() {
  return `<div class="row">
        <div class="col-lg-12">
            <h4><u>Инструкции по настройке OctoPrint / OctoFarm</u></h4><br>
            <p>Для установления соединения потребуется изменить некоторые настройки OctoPrint и перезапустить сервис OctoPrint.</p><p>Нажмите кнопки ниже для отображения инструкций, если необходимо.
            В противном случае закройте и продолжайте.</p>
        </div>
    </div>
    <div class="row">
        <div class="col-md-6">
            <button class="btn btn-primary" type="button" data-toggle="collapse" data-target="#octoprintCollapse"
                    aria-expanded="false" aria-controls="octoprintCollapse">
                Настройка OctoPrint
            </button>
        </div>
        <div class="col-md-6">
            <button class="btn btn-primary" type="button" data-toggle="collapse" data-target="#octofarmCollapse"
                    aria-expanded="false" aria-controls="octofarmCollapse">
                Инструкции OctoFarm
            </button>
        </div>
    </div>
    <div class="collapse" id="octofarmCollapse">
        <div class="card card-body">
            <div class="row pb-1">
                <div class="col">
                    <label htmlFor="psPrinterName">Имя:</label>
                    <input id="psPrinterName" type="text" class="form-control" placeholder="Имя принтера" disabled>
                        <small class="form-text text-muted">Пользовательское имя для вашего экземпляра OctoPrint. Оставьте пустым,
                            чтобы получить из OctoPrint -> Настройки -> Имя оформления.</small>
                        <small class="form-text text-muted">Если поле пустое и имя не найдено, будет использован
                            URL принтера по умолчанию.</small>
                        <small>Пример: <code>Мой принтер</code></small>
                </div>
                <div class="col">
                    <label htmlFor="psPrinterURL">URL принтера:</label>
                    <input id="psPrinterURL" type="text" class="form-control" placeholder="URL принтера" disabled>
                        <small class="form-text text-muted">URL хоста OctoPrint включая порт. По умолчанию используется "http://",
                            если не указано.</small>
                        <small>Пример: <code>http://192.168.1.5:81</code></small>
                </div>
                <div class="col">
                    <label htmlFor="psCamURL">URL камеры:</label>
                    <input id="psCamURL" type="text" class="form-control" placeholder="URL камеры" disabled>
                        <small class="form-text text-muted">URL видеопотока камеры mjpeg. По умолчанию используется "http://",
                            если не указано.</small>
                        <small class="form-text text-muted">Вы также можете оставить это поле пустым для автоматического
                            определения из OctoPrint.</small>
                        <small>Пример: <code>http://192.168.1.5/webcam/?action=stream</code></small>
                </div>
            </div>
            <div class="row pb-2">
                <div class="col">
                    <label htmlFor="psPrinterGroup">Группа:</label>
                    <input id="psPrinterGroup" type="text" class="form-control" placeholder="Группа принтера"
                           disabled>
                        <small class="form-text text-muted">OctoFarm поддерживает группировку принтеров</small>
                        <small>Пример: <code>Стойка 1</code></small>
                </div>
                <div class="col">
                    <label htmlFor="psAPIKEY">API-ключ:</label>
                    <input id="psAPIKEY" type="text" class="form-control" placeholder="API-ключ" disabled>
                        <small class="form-text text-muted">API-ключ OctoPrint. Для OctoPrint версии 1.4.1+ необходимо использовать
                            ключ пользователя/приложения.</small>
                        <small class="form-text text-muted">Если вы не используете аутентификацию на вашем экземпляре OctoPrint,
                            используйте глобальный API-ключ, который должен работать со всеми версиями
                            OctoPrint.</small>
                </div>

            </div>
        </div>
    </div>
    <div class="collapse" id="octoprintCollapse">
        <div class="card card-body">
            <div class="row">
                <div class="col-md-3">
                    <p>1. Убедитесь, что CORS включён и OctoPrint был перезапущен...</p>
                </div>
                <div class="col-md-9">
                    <img width="100%" src="/assets/images/userCORSOctoPrint.png">
                </div>
            </div>
            <div class="row">
                <div class="col-md-9">
                    <p>2. Получите API-ключ вашего экземпляра OctoPrint.<br> Его можно сгенерировать в диалоге настроек пользователя.
                    </p>
                    <code>Примечание: начиная с OctoPrint версии 1.4.1 рекомендуется подключаться с использованием ключа приложения /
                        ключа пользователя, описанного ниже. Для более ранних версий подходит глобальный API-ключ,
                        сгенерированный OctoPrint.</code>
                </div>
                <div class="col-md-3">
                    <img src="/assets/images/userSettingsOctoPrint.png">
                </div>
            </div>
            <div class="row">
                <div class="col-md-5">
                    <p>2.1 Вы можете сгенерировать API-ключ от текущего пользователя.</p>
                    <code>Обратите внимание, этот пользователь должен иметь права администратора. Если не уверены, обычно
                        это первый созданный вами пользователь.</code>
                </div>
                <div class="col-md-7">
                    <img src="/assets/images/userAPIKEYOctoPrint.png">
                </div>
            </div>
        </div>
        <div class="row">
            <div class="col-md-5">
                <p>2.1 Вы можете сгенерировать API-ключ для конкретного приложения.</p>
                <code>Обратите внимание, этот пользователь должен иметь права администратора. Если не уверены, обычно это
                    первый созданный вами пользователь.</code>
            </div>
            <div class="col-md-7">
                <img src="/assets/images/userApplicationKeyOctoPrint.png">
            </div>
        </div>
    </div>
`;
}
