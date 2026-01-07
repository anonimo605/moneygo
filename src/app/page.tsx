
"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Wallet, UserPlus, Phone, Lock, Hash, DollarSign, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth, useFirestore, setDocumentNonBlocking, errorEmitter } from "@/firebase";
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import { generateReferralCodeFromUID } from "@/lib/referral";
import { FirestorePermissionError } from "@/firebase/errors";

function AuthPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const auth = useAuth();
  const firestore = useFirestore();
  const { toast } = useToast();

  const [isSignUp, setIsSignUp] = useState(false);

  const [phoneNumber, setPhoneNumber] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [referralCode, setReferralCode] = useState("");

  useEffect(() => {
    const refFromUrl = searchParams.get('ref');
    if (refFromUrl) {
      setReferralCode(refFromUrl);
      setIsSignUp(true);
    }
  }, [searchParams]);

  const formatEmailFromPhone = (phone: string) => `${phone}@email.com`;

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth || !firestore) return;
    if (password !== confirmPassword) {
      toast({
        variant: "destructive",
        title: "Error de registro",
        description: "Las contraseñas no coinciden.",
      });
      return;
    }
    try {
      const email = formatEmailFromPhone(phoneNumber);
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      const ownReferralCode = generateReferralCodeFromUID(user.uid);

      // Create user document in Firestore
      const userDocRef = doc(firestore, "users", user.uid);
      const userData = {
        id: user.uid,
        email: user.email,
        firstName: "",
        lastName: "",
        registrationDate: new Date().toISOString(),
        isSuperAdmin: false,
        referralCode: ownReferralCode,
        referredBy: referralCode || null,
        balance: 0,
        hasInvested: false, // Initialize hasInvested field
      };
      setDocumentNonBlocking(userDocRef, userData, {});


      // Create wallet document for the user
      const walletId = doc(doc(firestore, 'users', user.uid), 'wallets', 'main').id;
      const walletDocRef = doc(firestore, `users/${user.uid}/wallets`, walletId);
      const walletData = {
        id: walletId,
        userId: user.uid,
        name: "Billetera Principal",
        balance: 0, 
        creationDate: new Date().toISOString(),
      };
      setDocumentNonBlocking(walletDocRef, walletData, {});

      router.push("/dashboard");
    } catch (error: any) {
      let description = "No se pudo crear la cuenta. Por favor, inténtalo de nuevo.";
      if (error.code === 'auth/email-already-in-use') {
        description = "Este número de teléfono ya está registrado. Por favor, inicia sesión.";
      }
      toast({
        variant: "destructive",
        title: "Error de registro",
        description: description,
      });
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth) return;
    try {
      const email = formatEmailFromPhone(phoneNumber);
      await signInWithEmailAndPassword(auth, email, password);
      router.push("/dashboard");
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error al iniciar sesión",
        description: "Las credenciales son incorrectas. Inténtalo de nuevo.",
      });
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-center gap-2 rounded-t-lg bg-green-100 p-2 text-center text-sm font-semibold text-green-800">
            <ShieldCheck className="h-5 w-5" />
            <span>Sitio oficial verificado y seguro</span>
        </div>
        <CardHeader className="text-center pt-4">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <DollarSign className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="text-3xl font-headline">MoneyGo</CardTitle>
          <CardDescription>
            {isSignUp ? "Crea una cuenta para empezar." : "Accede a tu cuenta de forma segura."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isSignUp ? (
            <form onSubmit={handleSignUp} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="phone-number">Número de Teléfono</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="phone-number"
                    type="tel"
                    placeholder="Tu número de teléfono"
                    required
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Contraseña</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="Crea una contraseña segura"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
               <div className="space-y-2">
                <Label htmlFor="confirm-password">Repetir Contraseña</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="confirm-password"
                    type="password"
                    placeholder="Confirma tu contraseña"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
               <div className="space-y-2">
                <Label htmlFor="referral">Código de Referido (Opcional)</Label>
                <div className="relative">
                  <Hash className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="referral"
                    type="text"
                    placeholder="Introduce el código de referido"
                    value={referralCode}
                    onChange={(e) => setReferralCode(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <Button type="submit" className="w-full" size="lg">
                <UserPlus className="mr-2 h-4 w-4" />
                Registrarse
              </Button>
            </form>
          ) : (
             <form onSubmit={handleSignIn} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="phone-number-signin">Número de Teléfono</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="phone-number-signin"
                    type="tel"
                    placeholder="Tu número de teléfono"
                    required
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="password-signin">Contraseña</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="password-signin"
                    type="password"
                    placeholder="Introduce tu contraseña"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <Button type="submit" className="w-full" size="lg">
                <Wallet className="mr-2 h-4 w-4" />
                Iniciar Sesión
              </Button>
            </form>
          )}
           <Button variant="link" onClick={() => setIsSignUp(!isSignUp)} className="w-full mt-4">
            {isSignUp ? "¿Ya tienes una cuenta? Inicia Sesión" : "¿No tienes una cuenta? Regístrate"}
          </Button>
        </CardContent>
        <CardFooter>
          <p className="text-xs text-muted-foreground text-center w-full">
            Tu información está protegida con los más altos estándares de seguridad.
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}

export default function AuthPage() {
  return (
    <Suspense fallback={<div>Cargando...</div>}>
      <AuthPageContent />
    </Suspense>
  );
}
