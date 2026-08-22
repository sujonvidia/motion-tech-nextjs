import { CheckoutLayout } from '@/src/layouts';
import { InferGetServerSidePropsType } from 'next';
import React from 'react';
import { OrderForm } from './components/OrderForm';
import { useTranslation } from 'next-i18next';
import { getServerSideProps } from './props';
import { CheckoutCarousel } from './components/OrderSummary/CheckoutCarousel';
import styled from '@emotion/styled';
import { ContentContainer } from '@/src/components/atoms';

type CheckoutPageProps = Partial<InferGetServerSidePropsType<typeof getServerSideProps>> & {
    autoPlaceOrder?: boolean;
    paymentMethod?: string;
    shippingMethods?: NonNullable<InferGetServerSidePropsType<typeof getServerSideProps>['eligibleShippingMethods']>;
};

export const CheckoutPage: React.FC<CheckoutPageProps> = props => {
    const { t } = useTranslation('checkout');
    const {
        availableCountries,
        alsoBoughtProducts,
        eligibleShippingMethods,
        eligiblePaymentMethods,
        activeCustomer,
        autoPlaceOrder,
        paymentMethod,
        shippingMethods,
    } = props;

    return (
        <CheckoutLayout pageTitle={`${t('seoTitles.checkout')}`}>
            <Content>
                <OrderForm
                    availableCountries={availableCountries}
                    shippingMethods={shippingMethods ?? eligibleShippingMethods ?? null}
                    activeCustomer={activeCustomer ?? null}
                    paymentMethod={paymentMethod ?? eligiblePaymentMethods?.find(method => method.code === 'standard-payment')?.code}
                    autoPlaceOrder={autoPlaceOrder}
                />
                    <CheckoutCarousel alsoBoughtProducts={alsoBoughtProducts ?? null} />
            </Content>
        </CheckoutLayout>
    );
};

const Content = styled(ContentContainer)`
    position: relative;
    width: 1280px;
    padding: 0;

    @media (max-width: 1560px) {
        width: 1440px;
        padding: 0 4rem;
    }
`;
