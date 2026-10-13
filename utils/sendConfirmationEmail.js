const CONFIRMATION_EMAIL_ENDPOINT = 'https://www.northbikers.com/api/send_confirmation_email';

export const sendConfirmationEmail = async (eventProfileId) => {
    if (!eventProfileId) {
        throw new Error('No se encontró el registro del participante.');
    }

    const response = await fetch(CONFIRMATION_EMAIL_ENDPOINT, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ eventProfileId }),
    });

    if (!response.ok) {
        let message = 'No se pudo enviar el correo de inscripción.';

        try {
            const result = await response.json();
            message = result?.error || result?.message || message;
        } catch (_) {
            // The endpoint may return an empty or non-JSON error response.
        }

        throw new Error(message);
    }

    return response;
};
