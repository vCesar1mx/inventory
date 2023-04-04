function syncro(data) {
    $("#pname").val(data.name)
    $("#price").text(data.price)
    $("#quantity").attr('placeholder', data.stock + ' (En stock)');
    if (data.stock >= 1) {
        $("#quantity").attr('max', data.stock);
        $("#quantity").attr('min', 1);
    }
    if (data.stock < 1) {
        $("#quantity").attr('max', data.stock);
        $("#quantity").attr('min', data.stock);
    }
    console.log(data.stock)
    $("#type").val(data.type)
    $("#barcode").val(data.barcode)
    JsBarcode("#barcode_s", data.barcode, { format: "CODE128" });
    document.getElementById("imgTest").src = '/img/' + data.path_image;
}

function barcode_s() {
    let text_code = $("#barcode").val();
    var data_sync
    $.ajax({
        type: "GET",
        url: "/api/" + text_code,
        contentType: "application/json; charset=utf-8",
        crossDomain: true,
        dataType: "json",
        success: function(data, status, jqXHR) {
            data_sync = data[0];
            alertify.confirm('Se ha encontrado un registro para: ' + text_code,
                '¿Deseas sincronizar los datos?',
                function() {
                    syncro(data_sync);
                    alertify.success('Datos sincronizados.')
                },
                function() {
                    alertify.error('Error al obtener los datos.');
                });
        },

        error: function(jqXHR, status) {
            alertify.error('No se ha encontrado ningun producto.');
        }
    });

}

function barcodeChange() {
    let text_code = $("#barcode").val();
    JsBarcode("#barcode_s", text_code, { format: "CODE128" });
}


function shopcart() {
    if (mode != 2) { mode = 2; }
    var formData = { id: uniq, quantity: $("#quantity").val(), barcode: $("#barcode").val(), name: $("#pname").val() };

    $.ajax({
        type: "POST",
        url: "/v1/create-list",
        data: formData,
        success: function(data, status, jqXHR) {
            alertify.notify('Producto: ' + $("#pname").val() + ', agregado');
        },
        error: function(jqXHR, status) {
            alertify.error('No se ha encontrado ningun producto.');
        }
    });
    console.log('1')
}

var mode = '1';
var uniq = 'id' + (new Date()).getTime();
$(document).ready(function() {
    JsBarcode("#barcode_s", "00000000000", { format: "CODE128" });
    $('#productform').submit(function(e) {
        e.preventDefault();
        if (mode == '1') {
            if ($("#quantity").val() < 1) return alertify.notify('No hay stock para vender.', 'error', 5, function() { console.log('dismissed'); });
            var formData = { quantity: $("#quantity").val(), barcode: $("#barcode").val(), };
            //console.log(formData)
            $.ajax({
                url: "/v1/sell",
                type: "POST",
                data: formData,
                success: function(data, status, jqXHR) {
                    alertify.notify('Datos actualizados.', 'success', 5, function() { console.log('dismissed'); });
                },
                error: function(jqXHR, status) { alertify.notify('Ha ocurrido un error al enviar.', 'error', 5, function() { console.log('dismissed'); }); }
            });
        } else {
            console.log('modo 2')

        }
    });
});