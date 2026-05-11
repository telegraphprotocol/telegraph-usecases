import { Request, Response } from 'express';
import * as authService from '../services/auth.service';
import { AuthRequest } from '../middlewares/auth.middleware';

export const getMessage = (req: Request, res: Response) => {
  const message = authService.generateLoginMessage();
  res.json({ message });
};

export const verify = async (req: Request, res: Response) => {
  try {
    const { address, signature } = req.body;
    if (!address || !signature) {
      return res.status(400).json({ error: 'Address and signature are required' });
    }

    const { token, user } = await authService.loginOrRegister(address, signature);
    res.json({ token, user });
  } catch (error: any) {
    res.status(401).json({ error: error.message });
  }
};

import prisma from '../utils/prisma';

export const getStatus = async (req: AuthRequest, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user?.id },
      include: { wallet: true }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ 
      authenticated: true, 
      user: {
        id: user.id,
        address: user.address,
        hasWallet: !!user.wallet,
        custodialAddress: user.wallet?.address
      }
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};
