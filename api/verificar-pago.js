// /api/verificar-pago.js
//
// Verifica el pago en Stripe y redirige al archivo correspondiente.
// Funciona para CUALQUIER producto: identifica cuál es mirando el
// Price ID de Stripe de la compra y buscándolo en la tabla "productos".
// Así no hace falta una función ni una URL de redirección distinta
// por cada Excel — se configura UNA SOLA VEZ en todos los Payment Links.
//
// En el Payment Link de Stripe de CADA producto, configura:
//   Confirmation page → "Don't show confirmation page" → URL de redirección:
//   https://gestio.com.es/api/verificar-pago?session_id={CHECKOUT_SESSION_ID}
//
// Variables de entorno necesarias en Vercel:
//   STRIPE_SECRET_KEY
//   SUPABASE_URL
//   SUPABASE_SERVICE_ROLE_KEY   (no la anon key: aquí sí hace falta saltar la RLS)

import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const BUCKET_PRIVADO = 'productos-privados';
const EXPIRA_SEGUNDOS = 300; // 5 minutos

export default async function handler(req, res) {
  const { session_id } = req.query;

  if (!session_id) {
    return paginaError(res, 400, 'Falta el identificador de la compra. Si acabas de pagar, escríbenos con tu recibo.');
  }

  let session;
  try {
    session = await stripe.checkout.sessions.retrieve(session_id, {
      expand: ['line_items'],
    });
  } catch (err) {
    console.error('Error consultando la sesión de Stripe:', err);
    return paginaError(res, 400, 'No pudimos encontrar esa compra. Si el cobro se realizó, escríbenos con tu recibo.');
  }

  if (session.payment_status !== 'paid') {
    return paginaError(res, 403, 'Todavía no detectamos un pago confirmado. Si el cargo aparece en tu banco, recarga esta página en unos segundos.');
  }

  const priceId = session.line_items?.data?.[0]?.price?.id;
  if (!priceId) {
    console.error('No se encontró price_id en la sesión', session.id);
    return paginaError(res, 500, 'Tu pago se confirmó, pero no identificamos el producto. Escríbenos a hola@gestio.com.es con tu número de pedido.');
  }

  const { data: producto, error: errorProducto } = await supabase
    .from('productos')
    .select('archivo_path, nombre')
    .eq('stripe_price_id', priceId)
    .single();

  if (errorProducto || !producto) {
    console.error('No se encontró producto para price_id', priceId, errorProducto);
    return paginaError(res, 500, 'Tu pago se confirmó, pero no encontramos el archivo asociado. Escríbenos a hola@gestio.com.es con tu número de pedido.');
  }

  const { data: firmada, error: errorFirmada } = await supabase
    .storage
    .from(BUCKET_PRIVADO)
    .createSignedUrl(producto.archivo_path, EXPIRA_SEGUNDOS);

  if (errorFirmada || !firmada?.signedUrl) {
    console.error('Error generando la URL firmada de Supabase:', errorFirmada);
    return paginaError(res, 500, 'Tu pago se confirmó, pero hubo un problema generando la descarga. Escríbenos a hola@gestio.com.es con tu número de pedido.');
  }

  res.writeHead(302, { Location: firmada.signedUrl });
  res.end();
}

function paginaError(res, status, mensaje) {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.status(status).send(`<!DOCTYPE html>
<html lang="es"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>gestio.com.es</title>
<style>body{font-family:'Inter',sans-serif;background:#0D1117;color:#E6EDF3;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;padding:24px;text-align:center;}
.box{max-width:420px;}h2{font-size:20px;margin-bottom:12px;}p{color:#94A3B8;font-size:14.5px;line-height:1.6;}a{color:#6EE7B7;text-decoration:none;font-weight:600;}</style>
</head><body><div class="box"><h2>Algo no fue bien</h2><p>${mensaje}</p><p><a href="/">Volver a gestio.com.es</a></p></div></body></html>`);
}
