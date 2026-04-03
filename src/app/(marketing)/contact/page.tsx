"use client";

import { motion } from "framer-motion";
import { fadeUp, staggerContainer } from "@/components/ui/Animations";
import { Send, Mail, MapPin } from "lucide-react";
import { useState } from "react";

import { useForm } from "@tanstack/react-form";
import { zodValidator } from "@tanstack/zod-form-adapter";
import { contactSchema } from "@/forms/shared/contact.schema";

export default function ContactPage() {
  const [success, setSuccess] = useState(false);

  const form = useForm({
    defaultValues: {
      name: "",
      email: "",
      message: "",
    },
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    validatorAdapter: zodValidator(),
    validators: {
      onChange: contactSchema,
    },
    onSubmit: async () => {
      // Simulate API call
      await new Promise(r => setTimeout(r, 1500));
      setSuccess(true);
      form.reset();
      setTimeout(() => setSuccess(false), 3000);
    },
  });

  return (
    <div className="pt-40 pb-32 px-6 max-w-6xl mx-auto">
       <motion.div
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
        className="grid grid-cols-1 lg:grid-cols-2 gap-16"
      >
        {/* Left Col */}
        <motion.div variants={fadeUp} className="flex flex-col justify-center">
          <h1 className="text-5xl md:text-6xl font-bold tracking-tight mb-6">
            Let&apos;s <span className="text-primary">connect.</span>
          </h1>
          <p className="text-lg text-muted-foreground font-light leading-relaxed mb-12 max-w-md">
            Whether you want to deploy DhobiQ in your PG, report a bug, or just say hello, we&apos;re here to help.
          </p>

          <div className="space-y-8">
            <div className="flex items-center gap-4">
               <div className="w-12 h-12 rounded-2xl bg-secondary flex items-center justify-center border border-border">
                 <Mail className="w-5 h-5 text-primary" />
               </div>
               <div>
                 <p className="text-sm text-muted-foreground font-medium">Email Us</p>
                 <a href="mailto:hello@dhobiq.app" className="text-lg font-bold hover:text-primary transition-colors">hello@dhobiq.app</a>
               </div>
            </div>
            
            <div className="flex items-center gap-4">
               <div className="w-12 h-12 rounded-2xl bg-secondary flex items-center justify-center border border-border">
                 <MapPin className="w-5 h-5 text-violet-500" />
               </div>
               <div>
                 <p className="text-sm text-muted-foreground font-medium">Headquarters</p>
                 <p className="text-lg font-bold">Bangalore, IN</p>
               </div>
            </div>
          </div>
        </motion.div>

        {/* Right Col / Form */}
        <motion.div variants={fadeUp}>
           <form 
              onSubmit={(e) => {
                e.preventDefault();
                e.stopPropagation();
                form.handleSubmit();
              }} 
              className="bg-card border border-border shadow-sm rounded-3xl p-8 md:p-10 flex flex-col gap-6 relative overflow-hidden transition-transform duration-300 hover:-translate-y-1"
            >
             <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 blur-[80px]" />
             
             {success && (
               <div className="relative z-10 bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 p-3 rounded-lg text-sm font-medium mb-2">
                 Your message has been sent successfully!
               </div>
             )}

             <form.Field name="name">
                {(field) => (
                  <div className="relative z-10 flex flex-col gap-1.5">
                    <label htmlFor={field.name} className="text-sm font-semibold text-card-foreground">Name</label>
                    <input 
                      id={field.name}
                      name={field.name}
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.target.value)}
                      placeholder="Tim Cook" 
                      className={`bg-background border rounded-xl px-4 py-3 text-foreground text-sm focus:outline-none focus:ring-1 transition-colors ${
                        field.state.meta.isTouched && field.state.meta.errors.length > 0 
                          ? 'border-rose-500 focus:border-rose-500 focus:ring-rose-500/50' 
                          : 'border-border focus:border-primary focus:ring-primary'
                      }`} 
                    />
                    {field.state.meta.isTouched && field.state.meta.errors.length > 0 && (
                      <p className="text-xs text-rose-500 font-medium">
                        {field.state.meta.errors.join(", ")}
                      </p>
                    )}
                  </div>
                )}
             </form.Field>

             <form.Field name="email">
                {(field) => (
                  <div className="relative z-10 flex flex-col gap-1.5">
                    <label htmlFor={field.name} className="text-sm font-semibold text-card-foreground">Email Address</label>
                    <input 
                      id={field.name}
                      name={field.name}
                      type="email"
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.target.value)}
                      placeholder="tim@apple.com" 
                      className={`bg-background border rounded-xl px-4 py-3 text-foreground text-sm focus:outline-none focus:ring-1 transition-colors ${
                        field.state.meta.isTouched && field.state.meta.errors.length > 0 
                          ? 'border-rose-500 focus:border-rose-500 focus:ring-rose-500/50' 
                          : 'border-border focus:border-primary focus:ring-primary'
                      }`} 
                    />
                    {field.state.meta.isTouched && field.state.meta.errors.length > 0 && (
                      <p className="text-xs text-rose-500 font-medium">
                        {field.state.meta.errors.join(", ")}
                      </p>
                    )}
                  </div>
                )}
             </form.Field>

             <form.Field name="message">
                {(field) => (
                  <div className="relative z-10 flex flex-col gap-1.5">
                    <label htmlFor={field.name} className="text-sm font-semibold text-card-foreground">Message</label>
                    <textarea 
                      id={field.name}
                      name={field.name}
                      rows={4} 
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.target.value)}
                      placeholder="I want to upgrade my PG..." 
                      className={`bg-background border rounded-xl px-4 py-3 text-foreground text-sm focus:outline-none focus:ring-1 transition-colors resize-none ${
                        field.state.meta.isTouched && field.state.meta.errors.length > 0 
                          ? 'border-rose-500 focus:border-rose-500 focus:ring-rose-500/50' 
                          : 'border-border focus:border-primary focus:ring-primary'
                      }`} 
                    />
                    {field.state.meta.isTouched && field.state.meta.errors.length > 0 && (
                      <p className="text-xs text-rose-500 font-medium">
                        {field.state.meta.errors.join(", ")}
                      </p>
                    )}
                  </div>
                )}
             </form.Field>

             <form.Subscribe selector={(state) => [state.canSubmit, state.isSubmitting]}>
               {([canSubmit, isSubmitting]) => (
                 <button 
                  type="submit" 
                  disabled={!canSubmit || isSubmitting} 
                  className="relative z-10 mt-2 py-4 rounded-xl bg-foreground text-background font-bold hover:scale-[1.02] transition-transform duration-300 flex items-center justify-center gap-2 disabled:opacity-50"
                 >
                   {isSubmitting ? "Sending..." : "Send Message"} <Send className="w-4 h-4" />
                 </button>
               )}
             </form.Subscribe>
           </form>
        </motion.div>
      </motion.div>
    </div>
  );
}
