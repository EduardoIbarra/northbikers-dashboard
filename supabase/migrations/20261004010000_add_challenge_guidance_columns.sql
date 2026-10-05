alter table public.checkpoints
    add column if not exists challenge_instructions text,
    add column if not exists challenge_hashtags_accounts text;

update public.checkpoints
set challenge_instructions = 'Lee y sigue las instrucciones específicas del reto. Para validar los puntos, publica una foto (no una historia) en Facebook o Instagram, etiquetando las cuentas indicadas e incluyendo el hashtag requerido. Toma una captura donde se vean las etiquetas y el hashtag y súbela a NorthBikers. Sin señal, haz el check-in en modo offline y sube la foto cuando tengas conexión. En cada checkpoint y reto, incluye una selfie con tu buff o jersey visible, o con el número de piloto de tu moto visible. Si falta algún requisito, los puntos no serán válidos.'
where is_challenge = true
  and (challenge_instructions is null or btrim(challenge_instructions) = '');

update public.checkpoints
set challenge_hashtags_accounts = '#RallyADVEdoMex'
where is_challenge = true
  and (challenge_hashtags_accounts is null or btrim(challenge_hashtags_accounts) = '');

alter table public.checkpoints
    alter column challenge_instructions set default 'Lee y sigue las instrucciones específicas del reto. Para validar los puntos, publica una foto (no una historia) en Facebook o Instagram, etiquetando las cuentas indicadas e incluyendo el hashtag requerido. Toma una captura donde se vean las etiquetas y el hashtag y súbela a NorthBikers. Sin señal, haz el check-in en modo offline y sube la foto cuando tengas conexión. En cada checkpoint y reto, incluye una selfie con tu buff o jersey visible, o con el número de piloto de tu moto visible. Si falta algún requisito, los puntos no serán válidos.',
    alter column challenge_hashtags_accounts set default '#RallyADVEdoMex';
