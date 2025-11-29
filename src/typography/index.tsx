import React from 'react';
import { BaseText, type BaseTextProps } from './BaseText';

export const Title: React.FC<Omit<BaseTextProps, 'size'>> = (props) => (
    <BaseText size="title" {...props} />
);

export const Heading: React.FC<Omit<BaseTextProps, 'size'>> = (props) => (
    <BaseText size="heading" {...props} />
);

export const Body: React.FC<Omit<BaseTextProps, 'size'>> = (props) => (
    <BaseText size="body" {...props} />
);

export const MediumText: React.FC<Omit<BaseTextProps, 'size'>> = (props) => (
    <BaseText size="medium" {...props} />
);

export const SmallText: React.FC<Omit<BaseTextProps, 'size'>> = (props) => (
    <BaseText size="small" {...props} />
);

export const ExtraSmallText: React.FC<Omit<BaseTextProps, 'size'>> = (props) => (
    <BaseText size="extraSmall" {...props} />
);
