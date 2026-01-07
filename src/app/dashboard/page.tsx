
"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Coins,
  Copy,
  Landmark,
  PlusCircle,
  Wallet,
  Send,
  Users,
  CheckCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import Link from 'next/link';

import { useFirestore, useMemoFirebase, useUser, useDoc } from "@/firebase";
import { doc } from "firebase/firestore";
import { useCurrency } from "@/context/currency-context";


type UserProfile = {
  id: string;
  balance: number;
}


export default function Dashboard() {
  const { user } = useUser();
  const firestore = useFirestore();
  const { currency, formatCurrency } = useCurrency();
  
  const userDocRef = useMemoFirebase(
    () => (user ? doc(firestore, `users/${user.uid}`) : null),
    [firestore, user]
  );
  const { data: userProfile } = useDoc<UserProfile>(userDocRef);

  const balanceUSD = userProfile?.balance ?? 0;
  
  return (
    <div className="flex flex-1 flex-col gap-4 md:gap-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight font-headline">Panel</h1>
          <p className="text-muted-foreground">
            Bienvenido a tu billetera segura.
          </p>
        </div>
      </div>

      <Card className="shadow-lg col-span-full">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Saldo Total</CardTitle>
          <Wallet className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold flex items-baseline gap-2">
            <span>{formatCurrency(balanceUSD)}</span>
            <span className="text-2xl text-muted-foreground">{currency}</span>
          </div>
        </CardContent>
      </Card>
      
      <div className="grid gap-4 md:grid-cols-2 md:gap-8">
        <Card className="shadow-lg">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2">
              <Coins className="h-6 w-6 text-primary" />
              <span>Depositar con Cripto</span>
            </CardTitle>
            <CardDescription>
              Añade fondos a tu billetera usando USDT u otras criptomonedas.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/dashboard/deposit?method=crypto" passHref>
                <Button className="w-full">
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Depositar USDT
                </Button>
            </Link>
          </CardContent>
        </Card>

        <Card className="shadow-lg">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2">
              <Landmark className="h-6 w-6 text-primary" />
              <span>Depositar con Banco</span>
            </CardTitle>
            <CardDescription>
              Transfiere desde tu cuenta de Nequi para empezar.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/dashboard/deposit?method=nequi" passHref>
                <Button className="w-full">
                    Depositar con Nequi
                </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

    
