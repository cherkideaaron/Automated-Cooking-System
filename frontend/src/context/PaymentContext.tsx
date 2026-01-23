import React, { createContext, ReactNode, useContext, useState } from 'react';

export interface Payment {
    id: string;
    recipeName: string;
    date: string;
    amount: number;
    status: 'approved' | 'pending' | 'rejected';
    creator?: string;
}

interface PaymentContextType {
    payments: Payment[];
    addPayment: (payment: Omit<Payment, 'id' | 'date' | 'status'>) => void;
}

const PaymentContext = createContext<PaymentContextType | undefined>(undefined);

export const PaymentProvider = ({ children }: { children: ReactNode }) => {
    // Initialize with some dummy data for demonstration
    const [payments, setPayments] = useState<Payment[]>([
        {
            id: '1',
            recipeName: 'Pasta Carbonara',
            date: '2024-01-15',
            amount: 4.99,
            status: 'approved',
            creator: 'Chef Mario'
        },
        {
            id: '2',
            recipeName: 'Custom Risotto',
            date: '2024-01-10',
            amount: 2.99,
            status: 'pending',
            creator: 'Risotto Master'
        },
    ]);

    const addPayment = (paymentData: Omit<Payment, 'id' | 'date' | 'status'>) => {
        const newPayment: Payment = {
            id: Date.now().toString(),
            date: new Date().toISOString().split('T')[0], // YYYY-MM-DD
            status: 'pending',
            ...paymentData,
        };
        setPayments(prev => [newPayment, ...prev]);
    };

    return (
        <PaymentContext.Provider value={{ payments, addPayment }}>
            {children}
        </PaymentContext.Provider>
    );
};

export const usePayment = () => {
    const context = useContext(PaymentContext);
    if (!context) {
        throw new Error('usePayment must be used within a PaymentProvider');
    }
    return context;
};
