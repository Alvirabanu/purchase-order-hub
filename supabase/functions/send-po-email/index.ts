import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const BREVO_API_KEY = Deno.env.get("BREVO_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface EmailRequest {
  to: string;
  toName: string;
  subject: string;
  htmlContent: string;
  textContent: string;
  fromEmail?: string;
  fromName?: string;
  ccEmail?: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (!BREVO_API_KEY) {
      console.error("BREVO_API_KEY is not configured");
      return new Response(
        JSON.stringify({ error: "Email service not configured" }),
        {
          status: 500,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    const { to, toName, subject, htmlContent, textContent, fromEmail, fromName, ccEmail }: EmailRequest = await req.json();

    console.log(`Sending email to: ${to}, subject: ${subject}`);

    // Prepare Brevo API request
    const brevoPayload: any = {
      sender: {
        name: fromName || "Purchase Order System",
        email: fromEmail || "noreply@yourdomain.com", // Should be a verified domain in Brevo
      },
      to: [
        {
          email: to,
          name: toName,
        },
      ],
      subject: subject,
      htmlContent: htmlContent,
      textContent: textContent,
    };

    // Add CC if provided
    if (ccEmail) {
      brevoPayload.cc = [{ email: ccEmail }];
    }

    const brevoResponse = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "accept": "application/json",
        "api-key": BREVO_API_KEY,
        "content-type": "application/json",
      },
      body: JSON.stringify(brevoPayload),
    });

    const responseData = await brevoResponse.json();

    if (!brevoResponse.ok) {
      console.error("Brevo API error:", responseData);
      return new Response(
        JSON.stringify({ error: responseData.message || "Failed to send email" }),
        {
          status: brevoResponse.status,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    console.log("Email sent successfully:", responseData);

    return new Response(
      JSON.stringify({ success: true, messageId: responseData.messageId }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error in send-po-email function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
