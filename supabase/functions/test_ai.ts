
import { PromptBuilder } from "./shared/ai/PromptBuilder.ts";

const pb = new PromptBuilder();

// Test 1: Müşteri DB kaydı (isReturning)
const contextReturning = {
  now: new Date(),
  timezone: "Europe/Istanbul",
  customerProfile: { isReturning: true, name: "Ahmet", pastAppointments: [] },
  channel: { platform: "whatsapp", supportsInteractiveButtons: false }
};
console.log("Test 1 (Returning):", pb.build(contextReturning).includes("Doğrudan ismiyle hitap et"));

// Test 2: Randevu Modülü Kapalı
const contextOff = {
  now: new Date(),
  timezone: "Europe/Istanbul",
  appointmentModuleEnabled: false,
  channel: { platform: "whatsapp", supportsInteractiveButtons: false }
};
console.log("Test 2 (Module Off):", pb.build(contextOff).includes("Randevu/rezervasyon özelliği KAPALIDIR"));

// Test 3: Cultural addressing
const prompt = pb.build(contextOff);
console.log("Test 3 (Cultural):", prompt.includes("kültürel nezaket normuna uygun şekilde hitap et"));
console.log("Test 3 (Cultural - lid ignore):", prompt.includes("@lid"));

// Test 4: Update Appointment rule
console.log("Test 4 (Update Appointment):", prompt.includes("update_appointment"));


