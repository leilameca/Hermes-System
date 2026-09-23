# Modulo GPS de HERMES SYSTEM

## Objetivo

El modulo permite obtener y compartir la ubicacion del usuario, observar cambios en tiempo real, buscar direcciones y consultar restaurantes, tiendas y lugares turisticos cercanos.

## Tecnologias utilizadas

- `@capacitor/geolocation`: acceso al GPS en Android y web.
- `@capacitor/share`: menu nativo para compartir un enlace de OpenStreetMap.
- `leaflet`: visualizacion interactiva del mapa y los marcadores.
- OpenStreetMap: mosaicos cartograficos sin una clave privada.
- Nominatim: busqueda manual de direcciones y lugares.
- Overpass API: puntos de interes en un radio de 1.5 kilometros.

## Archivos principales

- `src/app/core/services/location.service.ts`: permisos, GPS, seguimiento, busqueda, lugares cercanos y compartir.
- `src/app/features/location/location.page.ts`: estado y acciones de la interfaz.
- `src/app/features/location/location.page.html`: mapa, controles y resultados.
- `src/app/features/location/location.page.scss`: presentacion adaptable a computadora y telefono.

## Procesamiento de los datos

1. La aplicacion consulta el estado del permiso de ubicacion.
2. Si el permiso no ha sido concedido, muestra la solicitud del sistema operativo.
3. El GPS devuelve latitud, longitud, precision y fecha de lectura.
4. Leaflet centra el mapa y dibuja un marcador con un circulo de precision.
5. El seguimiento actualiza el mismo marcador cuando el dispositivo cambia de posicion.
6. Si el usuario es cliente, guarda como maximo una lectura cada diez segundos en Supabase.
7. El administrador consulta la ultima posicion y el recorrido de cada cliente de su empresa.
8. Nominatim convierte el texto buscado en coordenadas.
9. Overpass recibe las coordenadas actuales y devuelve puntos de interes cercanos.
10. HERMES calcula la distancia aproximada con la formula de Haversine y ordena los resultados.

La aplicacion no activa ubicacion en segundo plano. El recorrido se guarda solamente
cuando el cliente pulsa **Seguir en tiempo real** y mientras mantiene abierta la
pantalla GPS. Al salir de la pantalla el seguimiento se detiene. Esto reduce consumo
de bateria y permite que el cliente controle cuando comparte su posicion.

## Permisos

Android declara estos permisos en `android/app/src/main/AndroidManifest.xml`:

- `android.permission.ACCESS_COARSE_LOCATION`
- `android.permission.ACCESS_FINE_LOCATION`
- `android.permission.INTERNET`

Cuando se agregue la plataforma iOS, `Info.plist` debe incluir `NSLocationWhenInUseUsageDescription` con una explicacion visible para el usuario.

## Pruebas recomendadas

1. Android fisico con GPS activo y permiso preciso.
2. Android con permiso rechazado.
3. Navegador Chrome con ubicacion permitida y bloqueada.
4. Modo avion para comprobar el mensaje de error de los mapas y las API.
5. Busqueda de `Monumento de Santiago`.
6. Consulta de lugares cercanos en una zona con comercios.
7. Seguimiento caminando unos metros y comprobacion de las coordenadas.
8. Compartir la ubicacion mediante WhatsApp o mensaje.

## Evidencias para el informe y video

- Solicitud del permiso de ubicacion.
- Mapa centrado en la ubicacion real.
- Coordenadas y precision del GPS.
- Seguimiento en tiempo real activo.
- Resultado de una busqueda.
- Marcadores y lista de lugares cercanos.
- Menu nativo para compartir la ubicacion.
- Prueba con permiso denegado o sin conexion.
