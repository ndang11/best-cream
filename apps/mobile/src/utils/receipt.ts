import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Alert, Platform } from 'react-native';
import type { Order } from '@best-cream/shared';
import { formatXAF } from './location';

/**
 * Generates an elegant HTML receipt for Best Cream orders.
 */
export function generateReceiptHtml(order: Order): string {
  const formattedDate = new Date(order.createdAt).toLocaleDateString('en-GB', {
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

  const itemsHtml = order.items
    .map(
      (item) => `
      <tr>
        <td style="padding: 10px 0; border-bottom: 1px dashed #E2D9D2;">
          <div style="font-weight: 700; color: #3C2218; font-size: 13px;">${item.name}</div>
          ${
            item.flavor
              ? `<div style="font-size: 11px; color: #8A6E63;">Flavor: ${item.flavor}</div>`
              : ''
          }
          <div style="font-size: 11px; color: #8A6E63;">Unit: ${item.price.toLocaleString()} XAF</div>
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
        <title>Receipt - ${order.id}</title>
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
            margin-bottom: 6px;
          }
          .meta-row:last-child {
            margin-bottom: 0;
          }
          .meta-label {
            color: #8A6E63;
            font-weight: 500;
          }
          .meta-value {
            color: #3C2218;
            font-weight: 700;
          }
          .status-pill {
            display: inline-block;
            padding: 2px 8px;
            border-radius: 6px;
            font-size: 10px;
            font-weight: 800;
            background: #E8F5E9;
            color: #2E7D32;
            text-transform: uppercase;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
          }
          th {
            font-size: 11px;
            font-weight: 800;
            text-transform: uppercase;
            color: #8A6E63;
            padding-bottom: 8px;
            border-bottom: 2px solid #3C2218;
          }
          .summary-box {
            border-top: 2px solid #FAF6F0;
            padding-top: 14px;
            margin-bottom: 24px;
          }
          .summary-row {
            display: flex;
            justify-content: space-between;
            font-size: 13px;
            margin-bottom: 6px;
            color: #6B4E43;
          }
          .grand-total {
            display: flex;
            justify-content: space-between;
            align-items: center;
            font-size: 17px;
            font-weight: 900;
            color: #3C2218;
            margin-top: 10px;
            padding-top: 10px;
            border-top: 2px dashed #E2D9D2;
          }
          .paid-badge {
            background: #EBF8EE;
            border: 1px solid #A6E3B3;
            border-radius: 10px;
            padding: 10px;
            text-align: center;
            margin-bottom: 20px;
          }
          .paid-text {
            color: #1E662D;
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
            <p class="shop-sub">Artisanal Gelato & Fresh Golden Pancakes</p>
            <div class="shop-contact">
              📍 Centre-ville, Yaoundé, Cameroon<br/>
              📞 (+237) 670 123 456 • 🕒 09:00 - 22:00
            </div>
          </div>

          <!-- Metadata -->
          <div class="meta-box">
            <div class="meta-row">
              <span class="meta-label">Receipt No:</span>
              <span class="meta-value">REC-${order.id}</span>
            </div>
            <div class="meta-row">
              <span class="meta-label">Date & Time:</span>
              <span class="meta-value">${formattedDate}</span>
            </div>
            <div class="meta-row">
              <span class="meta-label">Payment Method:</span>
              <span class="meta-value">${paymentLabel}</span>
            </div>
            ${
              order.phoneNumber
                ? `
            <div class="meta-row">
              <span class="meta-label">Account Phone:</span>
              <span class="meta-value">${order.phoneNumber}</span>
            </div>`
                : ''
            }
            ${
              order.deliveryAddress
                ? `
            <div class="meta-row">
              <span class="meta-label">Delivery Destination:</span>
              <span class="meta-value">${order.deliveryAddress} ${
                    order.distanceKm ? `(${order.distanceKm.toFixed(1)} km)` : ''
                  }</span>
            </div>`
                : `
            <div class="meta-row">
              <span class="meta-label">Order Type:</span>
              <span class="meta-value">Store Pickup (Centre-ville)</span>
            </div>`
            }
            <div class="meta-row">
              <span class="meta-label">Order Status:</span>
              <span class="status-pill">${order.status}</span>
            </div>
          </div>

          <!-- Items Table -->
          <table>
            <thead>
              <tr>
                <th style="text-align: left;">Item Description</th>
                <th style="text-align: center; width: 45px;">Qty</th>
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
              <span>Subtotal</span>
              <span>${subtotal.toLocaleString()} XAF</span>
            </div>
            <div class="summary-row">
              <span>Delivery Fee</span>
              <span>${
                deliveryFee === 0 ? 'FREE' : `${deliveryFee.toLocaleString()} XAF`
              }</span>
            </div>
            <div class="grand-total">
              <span>TOTAL PAID</span>
              <span>${order.totalAmount.toLocaleString()} XAF</span>
            </div>
          </div>

          <!-- Verified Payment Banner -->
          <div class="paid-badge">
            <div class="paid-text">✓ VERIFIED & PAID VIA ${paymentLabel.toUpperCase()}</div>
          </div>

          <!-- Footer -->
          <div class="footer">
            <p style="margin: 0 0 4px 0; font-weight: 600;">Merci pour votre gourmandise! 🥞✨</p>
            <p style="margin: 0;">Keep this receipt for order pickup or customer support inquiries.</p>
            <div class="barcode">*${order.id}*</div>
          </div>
        </div>
      </body>
    </html>
  `;
}

/**
 * Downloads or shares the official receipt PDF on user's device.
 */
export async function downloadReceiptPdf(order: Order): Promise<void> {
  try {
    const html = generateReceiptHtml(order);

    // 1. Generate real PDF file
    const file = await Print.printToFileAsync({
      html,
      base64: false,
    });

    // 2. Check if native Sharing dialog is available (iOS / Android / mobile)
    const isAvailable = await Sharing.isAvailableAsync();

    if (isAvailable) {
      await Sharing.shareAsync(file.uri, {
        mimeType: 'application/pdf',
        dialogTitle: `Receipt - Best Cream ${order.id}`,
        UTI: 'com.adobe.pdf',
      });
    } else {
      // Fallback: Trigger print/save dialog (especially useful on Web)
      await Print.printAsync({
        html,
      });
    }
  } catch (error) {
    console.error('Error generating receipt PDF:', error);
    Alert.alert(
      'Receipt Error',
      'Could not generate or download the receipt PDF. Please try again.'
    );
  }
}
