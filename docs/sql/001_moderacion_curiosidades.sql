-- Moderación de curiosidades (Café Hondureño)
-- Agrega la columna "aprobada" a la tabla curiosidades.
--   1 = publicada · 0 = pendiente de revisión por un administrador
-- Las curiosidades que ya existen quedan publicadas (valor 1).
-- Se puede ejecutar más de una vez sin problema.
--
-- Cómo ejecutarlo: portal de Azure → tu base "cafehondureno" → Query editor (preview),
-- o desde la terminal del proyecto con:  npm run migrar

IF COL_LENGTH('dbo.curiosidades', 'aprobada') IS NULL
BEGIN
    ALTER TABLE dbo.curiosidades
        ADD aprobada BIT NOT NULL
        CONSTRAINT DF_curiosidades_aprobada DEFAULT (1);
END;
