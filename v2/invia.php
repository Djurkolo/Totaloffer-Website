<?php
/**
 * TotalOffer — invio del modulo contatti.
 *
 * Riceve i dati del modulo (POST), li valida e li spedisce via email.
 * Risponde in JSON alle richieste del sito (fetch) e con un redirect a chi
 * invia il modulo senza JavaScript.
 *
 * Richiede un hosting con PHP 7.4+ e la funzione mail() attiva.
 */

declare(strict_types=1);

/* ---------- Configurazione ---------- */
const DESTINATARIO = 'info@totaloffer.com';
// Mittente tecnico: deve essere un indirizzo del dominio del sito,
// altrimenti molti provider scartano il messaggio come spam.
const MITTENTE = 'noreply@totaloffer.com';
const MITTENTE_NOME = 'Sito TotalOffer';
// Limite antispam: invii consentiti per indirizzo IP in un'ora.
const MAX_INVII_ORA = 5;

const TIPI = ['Assistenza', 'Preventivo', 'Consulenza', 'Altro'];
const SERVIZI = [
    '', 'Helpdesk', 'Gestione sistemi', 'Gestione reti',
    'Sicurezza infrastruttura', 'Applicazioni web', 'Hardware e software',
];

/* ---------- Risposta ---------- */
$vuoleJson = stripos($_SERVER['HTTP_ACCEPT'] ?? '', 'application/json') !== false;

function rispondi(int $stato, array $dati): void
{
    global $vuoleJson;
    if ($vuoleJson) {
        http_response_code($stato);
        header('Content-Type: application/json; charset=utf-8');
        header('Cache-Control: no-store');
        echo json_encode($dati, JSON_UNESCAPED_UNICODE);
    } else {
        // Modulo inviato senza JavaScript: si torna alla pagina con l'esito.
        $esito = !empty($dati['ok']) ? 'inviato' : 'errore';
        header('Location: ./?modulo=' . $esito . '#contatti', true, 303);
    }
    exit;
}

function errore(int $stato, string $messaggio, array $campi = []): void
{
    rispondi($stato, ['ok' => false, 'errore' => $messaggio, 'campi' => $campi]);
}

/* ---------- Controlli sulla richiesta ---------- */
if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    header('Allow: POST');
    errore(405, 'Metodo non consentito.');
}

// La richiesta deve arrivare dallo stesso sito.
$origine = $_SERVER['HTTP_ORIGIN'] ?? '';
if ($origine !== '') {
    $hostOrigine = parse_url($origine, PHP_URL_HOST);
    $hostSito = preg_replace('/:\d+$/', '', $_SERVER['HTTP_HOST'] ?? '');
    if (!$hostOrigine || strcasecmp($hostOrigine, $hostSito) !== 0) {
        errore(403, 'Richiesta non valida.');
    }
}

/* ---------- Lettura e pulizia dei campi ---------- */
function campo(string $nome, int $max): string
{
    $v = $_POST[$nome] ?? '';
    if (!is_string($v)) {
        return '';
    }
    $v = trim(str_replace("\0", '', $v));
    return function_exists('mb_substr') ? mb_substr($v, 0, $max, 'UTF-8') : substr($v, 0, $max);
}

// Per i campi che finiscono nelle intestazioni dell'email: niente a capo.
function unaRiga(string $v): string
{
    return trim(preg_replace('/[\r\n\t]+/', ' ', $v));
}

// Campo-trappola invisibile: lo compilano solo i bot. Si finge un invio riuscito.
if (campo('sito', 200) !== '') {
    rispondi(200, ['ok' => true]);
}

$tipo = campo('tipo', 30);
$nome = unaRiga(campo('nome', 120));
$azienda = unaRiga(campo('azienda', 120));
$email = unaRiga(campo('email', 200));
$telefono = unaRiga(campo('telefono', 40));
$servizio = campo('servizio', 60);
$messaggio = campo('messaggio', 5000);
$privacy = campo('privacy', 10);

/* ---------- Validazione ---------- */
$campi = [];
if ($nome === '') {
    $campi['nome'] = 'Scrivi il tuo nome.';
}
if ($email === '' || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
    $campi['email'] = 'Controlla l\'indirizzo email.';
}
if ($telefono !== '' && !preg_match('/^[0-9 +().\/-]{5,40}$/', $telefono)) {
    $campi['telefono'] = 'Controlla il numero di telefono.';
}
if ($messaggio === '') {
    $campi['messaggio'] = 'Scrivi il messaggio.';
}
if ($privacy === '') {
    $campi['privacy'] = 'Serve il consenso al trattamento dei dati.';
}
if (!in_array($tipo, TIPI, true)) {
    $tipo = 'Altro';
}
if (!in_array($servizio, SERVIZI, true)) {
    $servizio = '';
}
if ($campi) {
    errore(422, 'Controlla i campi evidenziati.', $campi);
}

/* ---------- Limite di invii per IP ---------- */
$ip = $_SERVER['REMOTE_ADDR'] ?? 'sconosciuto';
$registro = sys_get_temp_dir() . '/totaloffer-modulo-' . hash('sha256', $ip) . '.json';
$ora = time();
$invii = [];
if (is_readable($registro)) {
    $letti = json_decode((string) file_get_contents($registro), true);
    if (is_array($letti)) {
        $invii = array_values(array_filter($letti, static fn ($t) => is_int($t) && $t > $ora - 3600));
    }
}
if (count($invii) >= MAX_INVII_ORA) {
    errore(429, 'Hai inviato troppe richieste. Riprova più tardi o chiamaci allo 06 5833 4882.');
}

/* ---------- Composizione dell'email ---------- */
$righe = [
    'Richiesta: ' . $tipo,
    'Servizio: ' . ($servizio !== '' ? $servizio : 'non indicato'),
    '',
    'Nome: ' . $nome,
];
if ($azienda !== '') {
    $righe[] = 'Azienda: ' . $azienda;
}
$righe[] = 'Email: ' . $email;
if ($telefono !== '') {
    $righe[] = 'Telefono: ' . $telefono;
}
$righe[] = '';
$righe[] = 'Messaggio:';
$righe[] = $messaggio;
$righe[] = '';
$righe[] = '--';
$righe[] = 'Inviato dal modulo contatti del sito il ' . date('d/m/Y \a\l\l\e H:i') . '.';
$righe[] = 'Il mittente ha accettato la privacy policy.';
$corpo = str_replace(["\r\n", "\r"], "\n", implode("\n", $righe));
$corpo = wordwrap($corpo, 998, "\n", true);
$corpo = str_replace("\n", "\r\n", $corpo);

function intestazione(string $testo): string
{
    return '=?UTF-8?B?' . base64_encode($testo) . '?=';
}

$oggetto = intestazione('[' . $tipo . '] ' . ($servizio !== '' ? $servizio : 'Richiesta dal sito') . ' - ' . $nome);
$intestazioni = implode("\r\n", [
    'From: ' . intestazione(MITTENTE_NOME) . ' <' . MITTENTE . '>',
    'Reply-To: ' . $email,
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset=UTF-8',
    'Content-Transfer-Encoding: 8bit',
    'X-Mailer: TotalOffer-Modulo',
]);

$inviata = @mail(DESTINATARIO, $oggetto, $corpo, $intestazioni, '-f' . MITTENTE);

if (!$inviata) {
    error_log('TotalOffer modulo contatti: mail() ha restituito false');
    errore(500, 'Non siamo riusciti a inviare il messaggio. Scrivi a info@totaloffer.com o chiama lo 06 5833 4882.');
}

$invii[] = $ora;
@file_put_contents($registro, json_encode($invii), LOCK_EX);

rispondi(200, ['ok' => true]);
