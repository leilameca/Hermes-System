# Guion del video de la Unidad VI

Duracion recomendada: entre cuatro y seis minutos.

## Presentacion

Hola. Somos el equipo de HERMES SYSTEM y en este video presentamos el modulo de
servicios de localizacion desarrollado con Ionic, Angular y Capacitor para la
Unidad VI de Programacion de Dispositivos Moviles.

## Acceso al modulo

Primero iniciamos sesion y entramos a la opcion Ubicacion GPS. La pantalla fue
disenada para funcionar tanto en un telefono Android como en un navegador web.

## Permiso y ubicacion actual

Al pulsar Mi ubicacion, la aplicacion comprueba el permiso de geolocalizacion.
Si todavia no fue concedido, Android muestra la solicitud. Luego obtenemos la
latitud, longitud, precision y hora de la lectura. Leaflet coloca el marcador y
un circulo de precision sobre el mapa de OpenStreetMap.

## Seguimiento y compartir

Con Seguir en tiempo real la aplicacion usa `watchPosition` y actualiza el
marcador cuando cambia la posicion. El seguimiento solo funciona mientras la
pantalla permanece abierta. Con Compartir se abre el menu nativo y se genera un
enlace de OpenStreetMap con las coordenadas actuales.

## Busqueda y lugares cercanos

La busqueda utiliza Nominatim. Como ejemplo escribimos Monumento de Santiago y
seleccionamos el resultado para centrar el mapa. Lugares cercanos consulta
Overpass API en un radio de 1.5 kilometros y muestra restaurantes, tiendas y
puntos turisticos ordenados por distancia.

## Vista administrativa

En el perfil administrador existen dos modos. Clientes en tiempo real muestra
la ultima ubicacion autorizada y el recorrido de cada cliente de la empresa. Mi
ubicacion permite al administrador localizarse, activar su seguimiento,
compartir y buscar lugares igual que los otros perfiles.

## Prueba de error y cierre

Tambien probamos el permiso rechazado o la falta de conexion para verificar que
la aplicacion muestre un mensaje claro y no se cierre inesperadamente.

Con estas funciones HERMES SYSTEM cumple la obtencion y uso del GPS, el
seguimiento, la busqueda, los puntos de interes, el uso de permisos y la
compatibilidad web y Android solicitados en la Unidad VI.
