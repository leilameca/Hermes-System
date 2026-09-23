# Entrega de la Unidad VI

Esta lista ayuda a revisar la actividad de localizacion antes de subirla al
campus. Los datos personales y las capturas se agregan al informe final antes
de entregarlo.

## Archivos de la entrega

- `HERMES_SYSTEM_Unidad_VI.zip`: codigo fuente completo sin `node_modules`,
  compilaciones temporales, archivos `.env` ni datos privados.
- `Informe_Tecnico_Unidad_VI_HERMES_SYSTEM.docx`: informe editable.
- Enlace del video demostrativo en YouTube o Google Drive.
- Enlace opcional de GitHub para que el docente pueda revisar el historial.

## Datos que deben aparecer en la portada

- Universidad Abierta para Adultos UAPA.
- Escuela de Ingenieria y Tecnologia.
- Asignatura Programacion de Dispositivos Moviles.
- Unidad VI Servicios de localizacion.
- Resultado de aprendizaje indicado por el docente.
- Nombre completo y matricula de cada integrante.
- NRC y nombre del facilitador.
- Fecha de entrega.

## Capturas requeridas

1. Inicio de sesion o menu principal de HERMES SYSTEM.
2. Solicitud del permiso de ubicacion en Android.
3. Mapa centrado en la ubicacion actual.
4. Coordenadas, hora y precision obtenida.
5. Seguimiento en tiempo real activo.
6. Busqueda de una direccion, por ejemplo Monumento de Santiago.
7. Restaurantes, tiendas o lugares turisticos cercanos.
8. Menu nativo para compartir la ubicacion.
9. Vista administrativa con clientes localizados.
10. Prueba con permiso rechazado o sin conexion.

Las capturas no deben mostrar contrasenas, claves de Supabase ni datos privados
de clientes reales. Para la demostracion se recomienda utilizar usuarios y
ubicaciones de prueba.

## Pruebas antes de entregar

- Ejecutar `npm install`.
- Ejecutar `npm run check`.
- Ejecutar `npm run sync:android`.
- Abrir Android Studio con `npm run open:android`.
- Probar en un telefono Android con GPS activado.
- Permitir ubicacion precisa y comprobar el valor de precision.
- Activar el seguimiento y caminar unos metros.
- Compartir el enlace mediante una aplicacion disponible.
- Buscar una direccion y consultar lugares cercanos.
- Repetir una prueba rechazando el permiso.
- Abrir la version web en Chrome y comprobar el diseño adaptable.

## Orden recomendado para subir al campus

1. Completar la portada y agregar las capturas al informe.
2. Subir el video y pegar su enlace en el informe.
3. Revisar que el enlace permita acceso al docente.
4. Abrir el ZIP y comprobar que contiene `package.json`, `src`, `android`,
   `supabase`, `README.md` y los documentos del proyecto.
5. Subir el ZIP y el informe en la actividad correspondiente.
