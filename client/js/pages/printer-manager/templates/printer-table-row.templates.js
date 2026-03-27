import { getPrinterNameBadge } from "../../../templates/printer.templates";
const returnAlerts = (id, printerURL) => {
  return `
    <button title="Нет доступных обновлений OctoPrint!" id="octoprintUpdate-${id}"
            class='tag btn btn-outline-info btn-sm d-none' ><i class="fab fa-raspberry-pi"></i></button>
    <button title="Нет доступных обновлений плагинов OctoPrint" id="octoprintPluginUpdate-${id}"
            class='tag btn btn-outline-success btn-sm d-none' ><i class="fas fa-plug"></i></button>
    <button title="Нет проблем при сканировании API OctoPrint"
            id="scanningIssues-${id}"
            type="button"
            class="tag btn btn-outline-danger btn-sm d-none"
            
    >
        <i class="fas fa-exclamation-triangle"></i>
    </button>
    <button title="Нет текущих проблем со здоровьем принтера!"
            id="healthIssues-${id}"
            type="button"
            class="tag btn btn-outline-warning btn-sm d-none"
            data-toggle="modal"
            data-target="#healthChecksModal"
    >
        <i class="fas fa-heartbeat"></i>
    </button>
    <button title="Требуется перезагрузка вашего экземпляра OctoPrint!"
            type="button"
            class="tag btn btn-outline-danger btn-sm d-none"
            id="restartRequired-${id}"  
    >
        <i class="fas fa-power-off"></i>
    </button>
    <button title="Обнаружена проблема с несколькими пользователями! Откройте настройки и выберите одного..."
            type="button"
            class="tag btn btn-outline-primary btn-sm d-none"
            data-toggle="modal"
            data-target="#printerEditModal"
            id="multiUserIssue-${id}"
    >
        <i class="fas fa-users"></i>
    </button>
        <button title="Зарегистрированные события принтера"
            type="button"
            class="tag btn btn-outline-info btn-sm d-none"
            data-toggle="modal"
            data-target="#printerEventsModal"
            id="printerEventsAlert-${id}"
    >
        <i class="fa-solid fa-calendar-check"></i> <span id="printerEventsCount-${id}"></span>
    </button>
    <a title="CORS не включён в OctoPrint!"
            type="button"
            class="tag btn btn-outline-danger btn-sm d-none"
            id="corsIssue-${id}" 
            target="_blank"
            href="${printerURL}"
    >
        <i class="fas fa-crosshairs"></i>
    </a>
    <button  title="Запланировано офлайн-сканирование настройки"
                 id="printerAPIScanning-${id}"
                 type="button"
                 class="tag btn btn-outline-danger btn-sm d-none"
                >
               <span id="apiReScanIcon-${id}"><i class="fas fa-redo fa-sm"></i></span><span id="apiReScanText-${id}"></span> 
    </button>
        <button  title="Запланировано офлайн-сканирование вебсокета"
                 id="printerWebsocketScanning-${id}"
                 type="button"
                 class="tag btn btn-outline-warning btn-sm d-none"
                >
               <span id="webosocketScanIcon-${id}"><i class="fas fa-sync-alt fa-sm"></i></span><span id="websocketScanText-${id}"></span> 
    </button>
    <button  title="Активирован безопасный режим!"
         id="printerSafeMode-${id}"
         type="button"
         class="tag btn btn-outline-warning btn-sm d-none"
        >
        <i class="fa-solid fa-shield-heart"></i>
    </button>
    <button  title="Низкое напряжение на вашем Pi!"
         id="printerUnderVoltaged-${id}"
         type="button"
         class="tag btn btn-outline-warning btn-sm d-none"
        >
       <i class="fa-solid fa-plug-circle-bolt"></i>
    </button>
    <button  title="Ваш Pi перегревается!"
         id="printerOverHeating-${id}"
         type="button"
         class="tag btn btn-outline-danger btn-sm d-none"
        >
       <i class="fa-solid fa-fire"></i>
    </button>
        <button  title="Ваше соединение ограничено!"
         id="printerConnectionThrottled-${id}"
         type="button"
         class="tag btn btn-outline-info btn-sm d-none"
        >
       <i class="fa-solid fa-toilet"></i> <span id="printerConnectionThrottledCount-${id}"></span>
    </button>
    <button title="Загрузка ЦП OctoPrint | Загрузка ЦП системы OctoPrint | Использование памяти системы OctoPrint"
            id="octoPrintsUsage-${id}"
            type="button"
            class="tag btn btn-outline-info btn-sm d-none"
    >
        <i class="fab fa-octopus-deploy"></i> <span id="octoprintsCpuUsagePercent-${id}"></span>% | <i class="fa-solid fa-microchip"></i> <span id="octoprintCpuUsagePercent-${id}"></span>% | <i class="fa-solid fa-memory"></i> <span id="octoprintMemoryUsagePercent-${id}"></span>%
    </button>
   `;
};

function returnPrinterManageDropDown(id, disabled) {
  let printerDisabledButton;
  if (!disabled) {
    printerDisabledButton = `
        <button  title="Принтер включён, нажмите для отключения"
                 id="printerDisable-${id}"
                 type="button"
                 class="btn dropdown-item"
                >
                <i class="fas fa-wheelchair"></i> Отключить
        </button>
        `;
  } else {
    printerDisabledButton = `
        <button  title="Принтер отключён, нажмите для включения"
                 id="printerDisable-${id}"
                 type="button"
                 class="btn dropdown-item"
                >
                <i class="fas fa-running text-success"></i> Включить
        </button>
        `;
  }
  return `
    <div class="btn-group">
          <button type="button" class="btn btn-info dropdown-toggle btn-sm" data-toggle="dropdown" aria-haspopup="true" aria-expanded="false">
            <i class="fa-solid fa-bars-progress"></i> Управление
          </button>
          <div class="dropdown-menu">
          <h6 class="dropdown-header">Подключение</h6>
          <button  title="Изменить настройки принтера"
                 id="printerEdit-${id}"
                 type="button"
                 class="btn btn-primary dropdown-item"
                 data-toggle="modal"
                 data-target="#printerEditModal"
                >
                <i class="fa-solid fa-pen-to-square text-warning"></i> Редактировать
            </button>
            <button title="Принудительное полное переподключение принтера"
                 id="printerForceReconnect-${id}"
                 type="button"
                 class="btn dropdown-item"
                >
                <i class="fa-solid fa-gavel text-danger"></i> Принудительное переподключение
                
            </button>
            ${printerDisabledButton}
            <hr>
            <h6 class="dropdown-header">Принтер</h6>
            <button  title="Изменить настройки принтера"
                 id="printerSettings-${id}"
                 type="button"
                 class="btn btn-primary dropdown-item"
                 data-toggle="modal"
                 data-target="#printerSettingsModal"
                >
                <i class="fas fa-cog text-info"></i> Настройки
            </button>
            <button  title="Просмотр логов принтера"
                 id="printerLog-${id}"
                 type="button"
                 class="tag btn btn-info dropdown-item"
                 data-toggle="modal"
                 data-target="#printerLogsModal"
            >
                <i class="fas fa-file-alt text-primary"></i> Логи
            </button>
            <hr>
            <h6 class="dropdown-header">Прочее</h6>
             <button title="Просмотр статистики принтера"
                     id="printerStatistics-${id}"
                     type="button"
                     class="tag btn btn-warning dropdown-item"
                     data-toggle="modal"
                     data-target="#printerStatisticsModal"
                >
                <i class="fas fa-chart-pie text-warning"></i> Статистика
              </button>
               <button  title="Настройка и отслеживание обслуживания принтеров"
                     id="printerMaintenance-${id}"
                     type="button"
                     class="tag btn btn-secondary dropdown-item d-none"
                     data-toggle="modal"
                     data-target="#printerMaintenanceModal"
                     disabled
                >
                    <i class="fas fa-wrench"></i> Обслуживание
            </button>
          </div>
        </div>
    `;
}

export function returnPrinterTableRow(printer) {
  return `
        <tr class="" id="printerCard-${printer._id}">
        <td class="align-middle">
            <span title="Перетащите для изменения порядка принтеров"  id="printerSortIndex-${
              printer._id
            }"
                   class="btn btn-light btn-sm sortableList" style="vertical-align: middle"><i class="fas fa-spinner fa-spin"></i>
            </span>
        </td>
        <td class="align-middle">
             ${getPrinterNameBadge(
               printer._id,
               printer.settingsAppearance.color,
               "center"
             )}
        </td>
        <td class="align-middle">
            <span id="printerURL-${printer._id}"></span>
        </td>
        <td class="align-middle">
            <span id="printerOctoPrintUser-${printer._id}"></span>
        </td>
                <td class="align-middle">
            <small>
                <span data-title="${printer.hostState.desc}" id="hostBadge-${
    printer._id
  }" class="tag badge badge-${printer.hostState.colour.name} badge-pill">
                    ${printer.hostState.state}
                </span>
            </small>
        </td>
        <td class="align-middle">
            <small>
                <span data-title="${
                  printer.printerState.desc
                }" id="printerBadge-${printer._id}" class="tag badge badge-${
    printer.printerState.colour.name
  } badge-pill">
                    ${printer.printerState.state}
                </span>
            </small>
        </td>
        <td class="align-middle">
            <small>
                <span data-title="${
                  printer.webSocketState.desc
                }" id="webSocketIcon-${printer._id}" class="tag badge badge-${
    printer.webSocketState.colour
  } badge-pill">
                    <i  class="fas fa-plug"></i>
                </span>
            </small>
        </td>

        <td class="align-middle" id="printerGroup-${printer._id}"></td>
         <td class="align-middle">
            <span id="printerControlUser-${printer._id}"></span>
        </td>
        <td class="align-middle" id="printerActionBtns-${printer._id}">

        </td>
        <td class="align-middle" id="printerManageBtns-${printer._id}">
            ${returnPrinterManageDropDown(printer._id, printer.disabled)}
        </td>
        <td class="align-middle" id="printerLastStatus-${printer._id}">
            
        </td>
        <td class="align-middle" id="printerAlertsBtns-${printer._id}">
            ${returnAlerts(printer._id, printer.printerURL)}
        </td>

    </tr>
    `;
}

export function returnDisabledPrinterTableRow(printer) {
  return `
   <tr class="printerDisabled" id="printerCard-${printer._id}">
        <td class="align-middle">
            <span title="Перетащите для изменения порядка принтеров"  id="printerSortIndex-${
              printer._id
            }"
                   class="btn btn-light btn-sm sortableList" style="vertical-align: middle"><i class="fas fa-spinner fa-spin"></i>
            </span>
        </td>
        <td class="align-middle" >
            ${getPrinterNameBadge(
              printer._id,
              printer.settingsAppearance.color,
              "center"
            )}
            </td>
                    <td class="align-middle">
            <span id="printerURL-${printer._id}"></span>
        </td>
                <td class="align-middle">
            <span id="printerOctoPrintUser-${printer._id}"></span>
        </td>
                <td class="align-middle">
            <small>
                <span data-title="${printer.hostState.desc}" id="hostBadge-${
    printer._id
  }" class="tag badge badge-dark badge-pill" disabled>
                    ${printer.hostState.state}
                </span>
            </small>
        </td>
        <td class="align-middle">
            <small>
                <span data-title="${
                  printer.printerState.desc
                }" id="printerBadge-${
    printer._id
  }" class="tag badge badge-dark badge-pill">
                    ${printer.printerState.state}
                </span>
            </small>
        </td>
        <td class="align-middle">
            <small>
                <span data-title="${
                  printer.webSocketState.desc
                }" id="webSocketIcon-${printer._id}" class="tag badge badge-${
    printer.webSocketState.colour
  } badge-pill">
                    <i  class="fas fa-plug"></i>
                </span>
            </small>
        </td>
        <td class="align-middle" id="printerGroup-${printer._id}"></td>
        <td class="align-middle">
            <span id="printerControlUser-${printer._id}"></span>
        </td>
        <td class="align-middle" id="printerActionBtns-${printer._id}">

        </td>
        <td class="align-middle" id="printerManageBtns-${printer._id}">
            ${returnPrinterManageDropDown(printer._id, printer.disabled)}
        </td>
        <td class="align-middle" id="printerLastStatus-${printer._id}">
        </td>
        <td class="align-middle" id="printerAlertsBtns-${printer._id}">
               ${returnAlerts(printer._id, printer.printerURL)}
        </td>

    </tr>
    `;
}
