import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';
import { Alert, Platform } from 'react-native';
import type { Order } from '@best-cream/shared';
import { formatXAF } from './location';

/**
 * Generates an elegant HTML receipt for Best Cream orders with EN/FR bilingual support.
 */
export function generateReceiptHtml(order: Order, lang: 'en' | 'fr' = 'en'): string {
  const isFr = lang === 'fr';

  const formattedDate = new Date(order.createdAt).toLocaleDateString(isFr ? 'fr-FR' : 'en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const subtotal = order.items.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );
  const deliveryFee = order.deliveryFee || 0;
  const paymentLabel =
    order.paymentMethod === 'mtn-momo' ? 'MTN Mobile Money' : 'Orange Money';

  const statusLabel =
    order.status === 'approved'
      ? (isFr ? 'APPROUVÉE' : 'APPROVED')
      : order.status === 'received'
      ? (isFr ? 'LIVRÉE' : 'DELIVERED')
      : (isFr ? 'EN ATTENTE' : 'PENDING');

  const itemsHtml = order.items
    .map(
      (item) => `
      <tr>
        <td style="padding: 10px 0; border-bottom: 1px dashed #E2D9D2;">
          <div style="font-weight: 700; color: #3C2218; font-size: 13px;">${item.name}</div>
          ${
            item.flavor
              ? `<div style="font-size: 11px; color: #8A6E63;">${isFr ? 'Parfum' : 'Flavor'}: ${item.flavor}</div>`
              : ''
          }
          ${
            item.servingStyle
              ? `<div style="font-size: 11px; color: #FF6584; font-weight: 600;">${isFr ? 'Service' : 'Serving'}: ${item.servingStyle}</div>`
              : ''
          }
          ${
            item.sizeOption
              ? `<div style="font-size: 11px; color: #8A6E63;">${isFr ? 'Taille' : 'Size'}: ${item.sizeOption}</div>`
              : ''
          }
          ${
            item.pancakeStyle
              ? `<div style="font-size: 11px; color: #8A6E63;">${isFr ? 'Style' : 'Style'}: ${item.pancakeStyle}</div>`
              : ''
          }
          ${
            item.selectedToppings && item.selectedToppings.length > 0
              ? `<div style="font-size: 11px; color: #8A6E63;">${isFr ? 'Garnitures' : 'Toppings'}: ${item.selectedToppings.map((t) => t.name).join(', ')}</div>`
              : ''
          }
          ${
            item.specialNotes
              ? `<div style="font-size: 11px; color: #FF6584; font-weight: 700; margin-top: 4px; padding: 6px 8px; background: #FFF2F4; border-radius: 6px;">📝 ${isFr ? 'Note' : 'Note'}: ${item.specialNotes}</div>`
              : ''
          }
          <div style="font-size: 11px; color: #8A6E63;">${isFr ? 'Prix unitaire' : 'Unit'}: ${item.price.toLocaleString()} XAF</div>
        </td>
        <td style="padding: 10px 0; text-align: center; border-bottom: 1px dashed #E2D9D2; font-weight: 700; color: #FF6584; font-size: 13px;">
          ${item.quantity}×
        </td>
        <td style="padding: 10px 0; text-align: right; border-bottom: 1px dashed #E2D9D2; font-weight: 800; color: #3C2218; font-size: 13px;">
          ${(item.price * item.quantity).toLocaleString()} XAF
        </td>
      </tr>
    `
    )
    .join('');

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>${isFr ? 'Reçu' : 'Receipt'} - ${order.id}</title>
        <style>
          @page {
            size: auto;
            margin: 20mm 15mm;
          }
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            background-color: #FAF6F0;
            color: #3C2218;
            margin: 0;
            padding: 24px;
            box-sizing: border-box;
          }
          .receipt-container {
            max-width: 480px;
            margin: 0 auto;
            background: #FFFFFF;
            border-radius: 20px;
            padding: 30px 26px;
            border: 1px solid #E8DFD8;
            box-shadow: 0 4px 20px rgba(60, 34, 24, 0.06);
          }
          .header {
            text-align: center;
            border-bottom: 2px solid #FAF6F0;
            padding-bottom: 20px;
            margin-bottom: 20px;
          }
          .logo-badge {
            display: inline-block;
            background: #FFE4E9;
            color: #FF6584;
            font-size: 28px;
            line-height: 48px;
            width: 48px;
            height: 48px;
            border-radius: 50%;
            margin-bottom: 8px;
          }
          .shop-title {
            font-size: 22px;
            font-weight: 900;
            color: #3C2218;
            letter-spacing: 0.5px;
            margin: 0;
          }
          .shop-sub {
            font-size: 12px;
            color: #8A6E63;
            margin: 4px 0 0 0;
          }
          .shop-contact {
            font-size: 11px;
            color: #A38C82;
            margin-top: 6px;
          }
          .meta-box {
            background: #FAF6F0;
            border-radius: 12px;
            padding: 14px 16px;
            margin-bottom: 20px;
            font-size: 12px;
          }
          .meta-row {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 4px 0;
          }
          .meta-label {
            color: #8A6E63;
            font-weight: 600;
          }
          .meta-value {
            font-weight: 700;
            color: #3C2218;
            text-align: right;
          }
          .status-pill {
            display: inline-block;
            background: #D8F3DC;
            color: #2D6A4F;
            font-weight: 800;
            font-size: 10px;
            padding: 3px 8px;
            border-radius: 20px;
            text-transform: uppercase;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
          }
          th {
            border-bottom: 2px solid #FAF6F0;
            padding-bottom: 8px;
            font-size: 11px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            color: #8A6E63;
          }
          .summary-box {
            background: #FAF6F0;
            border-radius: 12px;
            padding: 14px 16px;
            margin-bottom: 20px;
          }
          .summary-row {
            display: flex;
            justify-content: space-between;
            font-size: 12px;
            color: #8A6E63;
            padding: 4px 0;
          }
          .grand-total {
            display: flex;
            justify-content: space-between;
            font-size: 16px;
            font-weight: 900;
            color: #3C2218;
            border-top: 2px dashed #E2D9D2;
            padding-top: 10px;
            margin-top: 6px;
          }
          .paid-badge {
            text-align: center;
            padding: 12px;
            background: #FFF2F4;
            border: 1px dashed #FF6584;
            border-radius: 12px;
            margin-bottom: 20px;
          }
          .paid-text {
            color: #FF6584;
            font-weight: 800;
            font-size: 12px;
            letter-spacing: 0.5px;
          }
          .footer {
            text-align: center;
            font-size: 11px;
            color: #8A6E63;
            line-height: 1.5;
          }
          .barcode {
            margin-top: 16px;
            font-family: monospace;
            letter-spacing: 4px;
            font-size: 12px;
            color: #A38C82;
          }
        </style>
      </head>
      <body>
        <div class="receipt-container">
          <!-- Header -->
          <div class="header">
            <div class="logo-badge">🍦</div>
            <h1 class="shop-title">BEST CREAM</h1>
            <p class="shop-sub">${isFr ? 'Glaces & Gelato Artisanaux • Pancakes Dorés' : 'Artisanal Gelato & Fresh Golden Pancakes'}</p>
            <div class="shop-contact">
              📍 Centre-ville, Yaoundé, Cameroun<br/>
              📞 (+237) 670 123 456 • 🕒 09:00 - 22:00
            </div>
          </div>

          <!-- Metadata -->
          <div class="meta-box">
            <div class="meta-row">
              <span class="meta-label">${isFr ? 'N° de Reçu :' : 'Receipt No:'}</span>
              <span class="meta-value">REC-${order.id}</span>
            </div>
            <div class="meta-row">
              <span class="meta-label">${isFr ? 'Date & Heure :' : 'Date & Time:'}</span>
              <span class="meta-value">${formattedDate}</span>
            </div>
            <div class="meta-row">
              <span class="meta-label">${isFr ? 'Paiement :' : 'Payment Method:'}</span>
              <span class="meta-value">${paymentLabel}</span>
            </div>
            ${
              order.phoneNumber
                ? `
            <div class="meta-row">
              <span class="meta-label">${isFr ? 'N° Téléphone :' : 'Account Phone:'}</span>
              <span class="meta-value">${order.phoneNumber}</span>
            </div>`
                : ''
            }
            ${
              order.deliveryAddress
                ? `
            <div class="meta-row">
              <span class="meta-label">${isFr ? 'Adresse de Livraison :' : 'Delivery Destination:'}</span>
              <span class="meta-value">${order.deliveryAddress} ${
                    order.distanceKm ? `(${order.distanceKm.toFixed(1)} km)` : ''
                  }</span>
            </div>`
                : `
            <div class="meta-row">
              <span class="meta-label">${isFr ? 'Type de Commande :' : 'Order Type:'}</span>
              <span class="meta-value">${isFr ? 'Retrait en boutique (Centre-ville)' : 'Store Pickup (Centre-ville)'}</span>
            </div>`
            }
            <div class="meta-row">
              <span class="meta-label">${isFr ? 'Statut :' : 'Order Status:'}</span>
              <span class="status-pill">${statusLabel}</span>
            </div>
          </div>

          <!-- Items Table -->
          <table>
            <thead>
              <tr>
                <th style="text-align: left;">${isFr ? 'Désignation' : 'Item Description'}</th>
                <th style="text-align: center; width: 45px;">${isFr ? 'Qté' : 'Qty'}</th>
                <th style="text-align: right; width: 90px;">Total</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
            </tbody>
          </table>

          <!-- Financial Summary -->
          <div class="summary-box">
            <div class="summary-row">
              <span>${isFr ? 'Sous-total' : 'Subtotal'}</span>
              <span>${subtotal.toLocaleString()} XAF</span>
            </div>
            <div class="summary-row">
              <span>${isFr ? 'Frais de livraison' : 'Delivery Fee'}</span>
              <span>${
                deliveryFee === 0 ? (isFr ? 'GRATUIT' : 'FREE') : `${deliveryFee.toLocaleString()} XAF`
              }</span>
            </div>
            <div class="grand-total">
              <span>${isFr ? 'TOTAL PAYÉ' : 'TOTAL PAID'}</span>
              <span>${order.totalAmount.toLocaleString()} XAF</span>
            </div>
          </div>

          <!-- Verified Payment Banner -->
          <div class="paid-badge">
            <div class="paid-text">✓ ${isFr ? 'VÉRIFIÉ & PAYÉ VIA' : 'VERIFIED & PAID VIA'} ${paymentLabel.toUpperCase()}</div>
          </div>

          <!-- Footer -->
          <div class="footer">
            <p style="margin: 0 0 4px 0; font-weight: 600;">${isFr ? 'Merci pour votre gourmandise ! 🥞✨' : 'Thank you for your sweet order! 🥞✨'}</p>
            <p style="margin: 0;">${isFr ? 'Conservez ce reçu pour le retrait de votre commande ou pour toute demande.' : 'Keep this receipt for order pickup or customer support inquiries.'}</p>
            <div class="barcode">*${order.id}*</div>
          </div>
        </div>
      </body>
    </html>
  `;
}

/**
 * Downloads, shares, or prints the official receipt PDF on the user's device in their chosen language.
 */
export async function downloadReceiptPdf(order: Order, lang: 'en' | 'fr' = 'en'): Promise<void> {
  const html = generateReceiptHtml(order, lang);

  // Strategy 1: Print to file + FileSystem.copyAsync to cacheDirectory + Sharing.shareAsync
  try {
    const file = await Print.printToFileAsync({
      html,
      base64: false,
    });

    const cleanId = order.id.replace(/[^a-zA-Z0-9_-]/g, '');
    const fileName = `BestCream_Receipt_${cleanId}.pdf`;

    // Normalizing file URI
    let targetUri = file.uri;
    const cacheDir = FileSystem.cacheDirectory;

    if (cacheDir) {
      const destinationUri = `${cacheDir}${fileName}`;
      try {
        await FileSystem.copyAsync({
          from: file.uri,
          to: destinationUri,
        });
        targetUri = destinationUri;
      } catch (copyErr) {
        console.warn('Could not copy receipt to cacheDir:', copyErr);
      }
    }

    if (!targetUri.startsWith('file://') && !targetUri.startsWith('content://')) {
      targetUri = `file://${targetUri}`;
    }

    const isAvailable = await Sharing.isAvailableAsync();
    if (isAvailable) {
      await Sharing.shareAsync(targetUri, {
        mimeType: 'application/pdf',
        dialogTitle: `${lang === 'fr' ? 'Reçu Best Cream' : 'Best Cream Receipt'} - ${order.id}`,
        UTI: 'com.adobe.pdf',
      });
      return;
    }
  } catch (sharingError) {
    console.warn(
      'Direct file sharing encountered error, falling back to system PDF/Print manager:',
      sharingError
    );
  }

  // Strategy 2: Native System Print/Save as PDF Dialog (100% reliable across all Android & iOS devices)
  try {
    await Print.printAsync({ html });
  } catch (printError) {
    console.error('System print fallback failed:', printError);
    Alert.alert(
      lang === 'fr' ? 'Erreur de Reçu' : 'Receipt Error',
      lang === 'fr'
        ? 'Impossible de générer ou d’ouvrir le reçu PDF. Veuillez réessayer.'
        : 'Could not generate or open the receipt PDF. Please try again.'
    );
  }
}
