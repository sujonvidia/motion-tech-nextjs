import React, { useEffect } from 'react';

import { TH2, TP } from '@/src/components/atoms/TypoGraphy';
import { Stack } from '@/src/components/atoms/Stack';
import { Button } from '@/src/components/molecules/Button';

import { usePush } from '@/src/lib/redirect';

import { storefrontApiMutation, storefrontApiQuery } from '@/src/graphql/client';
import {
    CreateAddressType,
    ShippingMethodType,
    AvailableCountriesType,
    CreateCustomerType,
    ActiveOrderSelector,
    ActiveCustomerType,
} from '@/src/graphql/selectors';

import { useForm, SubmitHandler } from 'react-hook-form';
import { Trans, useTranslation } from 'next-i18next';
import styled from '@emotion/styled';
import { AnimatePresence, motion } from 'framer-motion';
import { zodResolver } from '@hookform/resolvers/zod';
import { Input, FormError, Banner, CountrySelect, CheckBox } from '@/src/components/forms';
import { DeliveryMethod } from '../DeliveryMethod';
import { useValidationSchema } from './useValidationSchema';
import { Link } from '@/src/components/atoms/Link';
import { useCheckout } from '@/src/state/checkout';
import { Info, MoveLeft } from 'lucide-react';
import { baseCountryFromLanguage } from '@/src/util/baseCountryFromLanguage';
import { OrderSummary } from '../OrderSummary';
import { useChannels } from '@/src/state/channels';
import { Tooltip } from '@/src/components/molecules/Tooltip';
// import { OrderPayment } from '@/src/components/pages/checkout/components/OrderPayment';

type FormValues = CreateCustomerType & {
    deliveryMethod?: string;
    shippingDifferentThanBilling?: boolean;
    shipping: CreateAddressType;
    billing: CreateAddressType;
    // userNeedInvoice?: boolean;
    // NIP?: string;
    createAccount?: boolean;
    password?: string;
    confirmPassword?: string;
    terms?: boolean;
};

interface OrderFormProps {
    availableCountries?: AvailableCountriesType[];
    activeCustomer: ActiveCustomerType | null;
    shippingMethods: ShippingMethodType[] | null;
    // eligiblePaymentMethods: any
}

const isAddressesEqual = (a: object, b?: object) => {
    try {
        return JSON.stringify(a) === JSON.stringify(b ?? {});
    } catch (e) {
        return false;
    }
};

type StandardMethodMetadata = Record<string, unknown>;

export const OrderForm: React.FC<OrderFormProps> = ({ availableCountries, activeCustomer }) => {
    const ctx = useChannels();
    const { activeOrder, changeShippingMethod } = useCheckout();
    let shippingMethods = [ {...activeOrder?.shippingLines[0]?.shippingMethod, price: 500}];


    const { t } = useTranslation('checkout');
    const { t: tErrors } = useTranslation('common');
    const push = usePush();
    const schema = useValidationSchema();

    const errorRef = React.useRef<HTMLDivElement>(null);

    const defaultShippingAddress = activeCustomer?.addresses?.find(address => address.defaultShippingAddress);
    const defaultBillingAddress = activeCustomer?.addresses?.find(address => address.defaultBillingAddress);

    const countryCode =
        defaultBillingAddress?.country.code ??
        defaultShippingAddress?.country.code ??
        availableCountries?.find(country => country.name === 'Bangladesh')?.code ??
        baseCountryFromLanguage(ctx.locale);

    const {
        register,
        handleSubmit,
        setValue,
        setError,
        clearErrors,
        watch,
        setFocus,
        formState: { errors, isSubmitting },
    } = useForm<FormValues>({
        delayError: 100,
        defaultValues: {
            shippingDifferentThanBilling: defaultShippingAddress
                ? !isAddressesEqual(defaultShippingAddress, defaultBillingAddress)
                : false,
            billing: { countryCode },
            // NIP: defaultBillingAddress?.customFields?.NIP ?? '',
            // userNeedInvoice: defaultBillingAddress?.customFields?.NIP ? true : false,
        },
        values: activeCustomer
            ? {
                  createAccount: false,
                  emailAddress: activeCustomer.emailAddress,
                  firstName: activeCustomer.firstName,
                  lastName: activeCustomer.lastName,
                  phoneNumber: activeCustomer.phoneNumber,
                  //   NIP: defaultBillingAddress?.customFields?.NIP ?? '',
                  //   userNeedInvoice: defaultBillingAddress?.customFields?.NIP ? true : false,
                  shippingDifferentThanBilling: defaultShippingAddress
                      ? !isAddressesEqual(defaultShippingAddress, defaultBillingAddress)
                      : false,
                  shipping: {
                      ...defaultShippingAddress,
                      streetLine1: defaultShippingAddress?.streetLine1 ?? '',
                      countryCode,
                  },
                  billing: {
                      ...defaultBillingAddress,
                      streetLine1: defaultBillingAddress?.streetLine1 ?? '',
                      countryCode,
                  },
              }
            : undefined,
        resolver: zodResolver(schema),
    });

    // Copy standardMethod from OrderPayment.tsx to OrderForm.tsx
    const standardMethod = async (method: string, metadata: StandardMethodMetadata) => {
        try {
            debugger;
            // setError(null);
            const { addPaymentToOrder } = await storefrontApiMutation(ctx)({
                addPaymentToOrder: [
                    { input: { method, metadata } },
                    {
                        __typename: true,
                        '...on Order': { state: true, code: true },
                        '...on IneligiblePaymentMethodError': {
                            message: true,
                            errorCode: true,
                            eligibilityCheckerMessage: true,
                        },
                        '...on NoActiveOrderError': {
                            message: true,
                            errorCode: true,
                        },
                        '...on OrderPaymentStateError': {
                            message: true,
                            errorCode: true,
                        },
                        '...on OrderStateTransitionError': {
                            message: true,
                            errorCode: true,
                            fromState: true,
                            toState: true,
                            transitionError: true,
                        },
                        '...on PaymentDeclinedError': {
                            errorCode: true,
                            message: true,
                            paymentErrorMessage: true,
                        },
                        '...on PaymentFailedError': {
                            errorCode: true,
                            message: true,
                            paymentErrorMessage: true,
                        },
                    },
                ],
            });

            
            console.log('addPaymentToOrder',addPaymentToOrder);

            if (addPaymentToOrder.__typename === 'Order') {
                push(`/checkout/confirmation/${addPaymentToOrder.code}`);
            } else {
                setError('root', { message: tErrors(`errors.backend.${addPaymentToOrder.errorCode}`) });
            }
        } catch (e) {
            console.log(e);
            // setError(tError(`errors.backend.UNKNOWN_ERROR`));
        }
    };

    const onSubmit: SubmitHandler<FormValues> = async ({
        emailAddress,
        firstName,
        lastName,
        deliveryMethod,
        billing,
        shipping,
        phoneNumber,
        // NIP,
        shippingDifferentThanBilling,
        createAccount,
        password,
    }) => {
        try {
            debugger;
            if (deliveryMethod && activeOrder?.shippingLines[0]?.shippingMethod.id !== deliveryMethod) {
                await changeShippingMethod(deliveryMethod);
            }
            const { nextOrderStates } = await storefrontApiQuery(ctx)({ nextOrderStates: true });
            if (!nextOrderStates.includes('ArrangingPayment')) {
                setError('root', { message: tErrors(`errors.backend.UNKNOWN_ERROR`) });
                // return;
            }
            // Set the billing address for the order
            const { setOrderBillingAddress } = await storefrontApiMutation(ctx)({
                setOrderBillingAddress: [
                    {
                        input: {
                            ...billing,
                            defaultBillingAddress: false,
                            defaultShippingAddress: false,
                            // customFields: { NIP }
                        },
                    },
                    {
                        __typename: true,
                        '...on Order': { id: true },
                        '...on NoActiveOrderError': { message: true, errorCode: true },
                    },
                ],
            });

            if (setOrderBillingAddress?.__typename !== 'Order') {
                setError('root', { message: tErrors(`errors.backend.${setOrderBillingAddress.errorCode}`) });
                return;
            }

            // Set the shipping address for the order
            if (shippingDifferentThanBilling) {
                // Set the shipping address for the order if it is different than billing
                const { setOrderShippingAddress } = await storefrontApiMutation(ctx)({
                    setOrderShippingAddress: [
                        { input: { ...shipping, defaultBillingAddress: false, defaultShippingAddress: false } },
                        {
                            __typename: true,
                            '...on Order': { id: true },
                            '...on NoActiveOrderError': { message: true, errorCode: true },
                        },
                    ],
                });

                if (setOrderShippingAddress?.__typename === 'NoActiveOrderError') {
                    setError('root', { message: tErrors(`errors.backend.NO_ACTIVE_ORDER_ERROR`) });
                    return;
                }
            } else {
                // Set the billing address for the order if it is the same as shipping
                const { setOrderShippingAddress } = await storefrontApiMutation(ctx)({
                    setOrderShippingAddress: [
                        { input: { ...billing, defaultBillingAddress: false, defaultShippingAddress: false } },
                        {
                            __typename: true,
                            '...on Order': { id: true },
                            '...on NoActiveOrderError': { message: true, errorCode: true },
                        },
                    ],
                });

                if (setOrderShippingAddress?.__typename === 'NoActiveOrderError') {
                    setError('root', { message: tErrors(`errors.backend.NO_ACTIVE_ORDER_ERROR`) });
                    return;
                }
            }

            if (!activeCustomer) {
                const { setCustomerForOrder } = await storefrontApiMutation(ctx)({
                    setCustomerForOrder: [
                        { input: { emailAddress, firstName, lastName, phoneNumber } },
                        {
                            __typename: true,
                            '...on Order': { id: true },
                            // '...on AlreadyLoggedInError': { message: true, errorCode: true },
                            '...on EmailAddressConflictError': { message: true, errorCode: true },
                            '...on GuestCheckoutError': { message: true, errorCode: true },
                            '...on NoActiveOrderError': { message: true, errorCode: true },
                        },
                    ],
                });

                if (setCustomerForOrder?.__typename !== 'Order') {
                    if (setCustomerForOrder.__typename === 'EmailAddressConflictError') {
                        // TODO: IN THIS CASE WE SHOULD SHOW THE LOGIN FORM or ADD A LINK TO LOGIN
                        setError('emailAddress', {
                            message: tErrors(`errors.backend.${setCustomerForOrder.errorCode}`),
                        });
                        setFocus('emailAddress');
                    } else {
                        setError('root', { message: tErrors(`errors.backend.${setCustomerForOrder.errorCode}`) });
                    }
                    // return;
                }
            }

            // Set the order state to ArrangingPayment
            const { transitionOrderToState } = await storefrontApiMutation(ctx)({
                transitionOrderToState: [
                    { state: 'ArrangingPayment' },
                    {
                        __typename: true,
                        '...on Order': ActiveOrderSelector,
                        '...on OrderStateTransitionError': {
                            errorCode: true,
                            message: true,
                            fromState: true,
                            toState: true,
                            transitionError: true,
                        },
                    },
                ],
            });

            // After all create account if needed and password is provided
            if (!activeCustomer && createAccount && password) {
                await storefrontApiMutation(ctx)({
                    registerCustomerAccount: [
                        { input: { emailAddress, firstName, lastName, phoneNumber, password } },
                        {
                            __typename: true,
                            '...on MissingPasswordError': {
                                message: true,
                                errorCode: true,
                            },
                            '...on NativeAuthStrategyError': {
                                message: true,
                                errorCode: true,
                            },
                            '...on PasswordValidationError': {
                                errorCode: true,
                                message: true,
                                validationErrorMessage: true,
                            },
                            '...on Success': {
                                success: true,
                            },
                        },
                    ],
                });
            }

            if (!transitionOrderToState) {
                setError('root', { message: tErrors(`errors.backend.UNKNOWN_ERROR`) });
                return;
            }

            if (transitionOrderToState?.__typename !== 'Order') {
                setError('root', { message: tErrors(`errors.backend.${transitionOrderToState.errorCode}`) });
                return;
            }

            await standardMethod("standard-payment", {
                amount: transitionOrderToState.totalWithTax, // Using the total amount
            });
            // Redirect to payment page
            // push('/checkout/payment');
        } catch (error) {
            setError('root', { message: tErrors(`errors.backend.UNKNOWN_ERROR`) });
        }
    };

    
    
    
    async function changeShip(id){
        debugger;
        await changeShippingMethod(id);
        setValue('deliveryMethod', id);
        clearErrors('deliveryMethod');
    }

    useEffect(()=>{
        changeShip("1");

    },[])

    return activeOrder?.totalQuantity === 0 ? (
        <Stack w100 column>
            <Stack column gap="2rem">
                <TH2 size="2rem" weight={500}>
                    {t('orderForm.emptyCart')}
                </TH2>
                <EmptyCartDescription>
                    <Trans i18nKey="orderForm.emptyCartDescription" t={t} components={{ 1: <Link href="/"></Link> }} />
                </EmptyCartDescription>
            </Stack>
        </Stack>
    ) : (
        <Stack w100 column>
            <Banner ref={errorRef} clearErrors={() => clearErrors('root')} error={errors?.root} />
            <Form onSubmit={handleSubmit(onSubmit)} noValidate>
                <Container w100 gap="10rem">
                    <OrderSummary
                        shipping={
                            shippingMethods ? (
                                <DeliveryMethodWrapper>
                                    <DeliveryMethod
                                        // selected={watch('deliveryMethod')}
                                        selected={"1"}
                                        error={errors.deliveryMethod?.message}
                                        onChange={async id => {
                                            debugger;
                                            // await changeShippingMethod(id);
                                            setValue('deliveryMethod', id);
                                            clearErrors('deliveryMethod');
                                        }}
                                        shippingMethods={shippingMethods}
                                        currencyCode={activeOrder?.currencyCode}
                                    />
                                </DeliveryMethodWrapper>
                            ) : null
                        }
                        footer={
                            <Stack column gap="2.5rem" justifyCenter itemsCenter>
                                {/* <OrderPayment availablePaymentMethods={eligiblePaymentMethods} stripeData={{ paymentIntent: null }} /> */}
                                <BuyNowButton loading={isSubmitting} type="submit">
                                    <TP color="contrast" upperCase>
                                        {t('orderForm.continueToPayment')}
                                    </TP>
                                </BuyNowButton>
                                <ShopNowButton href="/">{t('orderForm.continueShopping')}</ShopNowButton>
                            </Stack>
                        }
                    />
                    
                    <Stack w100 column gap="2rem">
                        <Stack column gap="0.5rem">
                            {/* Customer Part */}
                            <Stack column gap="2rem">
                                <Stack gap="0.75rem" itemsCenter style={{ height: '2.6rem' }}>
                                    <AnimatePresence>
                                        {!isSubmitting ? (
                                            <BackButton href="/">
                                                <MoveLeft size={24} />
                                            </BackButton>
                                        ) : null}
                                    </AnimatePresence>
                                    <TH2 size="2rem" weight={500}>
                                        {t('orderForm.contactInfo')}
                                    </TH2>
                                </Stack>

                                <Stack w100 column gap="1.5rem">
                                    <Stack w100 gap="1.5rem">
                                        <Input
                                            {...register('firstName')}
                                            placeholder={t('orderForm.placeholders.firstName')}
                                            label={t('orderForm.firstName')}
                                            error={errors.firstName}
                                            required
                                        />
                                        <Input
                                            {...register('lastName')}
                                            placeholder={t('orderForm.placeholders.lastName')}
                                            label={t('orderForm.lastName')}
                                            error={errors.lastName}
                                            required
                                        />
                                    </Stack>
                                    <Stack w100 gap="1.5rem">
                                        <Input
                                            {...register('phoneNumber', {
                                                onChange: e => (e.target.value = e.target.value.replace(/[^0-9]/g, '')),
                                            })}
                                            placeholder={t('orderForm.placeholders.phoneNumber')}
                                            type="tel"
                                            label={t('orderForm.phone')}
                                            error={errors.phoneNumber}
                                        />
                                        <Input
                                            {...register('emailAddress')}
                                            placeholder={t('orderForm.placeholders.emailAddress')}
                                            label={t('orderForm.emailAddress')}
                                            error={errors.emailAddress}
                                            required
                                            disabled={activeCustomer?.id ? true : false}
                                        />
                                    </Stack>
                                    <Stack w100 gap="1.5rem">
                                        <Input
                                            {...register('billing.streetLine1')}
                                            placeholder={t('orderForm.placeholders.streetLine1')}
                                            label={t('orderForm.streetLine1')}
                                            error={errors.billing?.streetLine1}
                                            required
                                        />
                                        {/* <Input
                                            {...register('billing.streetLine2')}
                                            placeholder={t('orderForm.placeholders.streetLine2')}
                                            label={t('orderForm.streetLine2')}
                                            error={errors.billing?.streetLine2}
                                        /> */}
                                    </Stack>
                                </Stack>
                            </Stack>

                            {/* Shipping Part */}
                            <BillingWrapper column style={{display: "none"}}>
                                <TH2 size="2rem" weight={500} style={{ marginBottom: '1.75rem' }}>
                                    {t('orderForm.billingInfo')}
                                </TH2>
                                <Stack w100 column gap="1.5rem">
                                    <Stack w100 gap="1.5rem" style={{display: "none"}}>
                                        <Input
                                            {...register('billing.fullName')}
                                            placeholder={t('orderForm.placeholders.fullName')}
                                            label={t('orderForm.fullName')}
                                            error={errors.billing?.fullName}
                                            required
                                            defaultValue={"Customer"}
                                        />
                                        <Input
                                            {...register('billing.city')}
                                            placeholder={t('orderForm.placeholders.city')}
                                            label={t('orderForm.city')}
                                            error={errors.billing?.city}
                                            required
                                            defaultValue={"Dhaka"}
                                        />
                                    </Stack>
                                    
                                    <Stack w100 gap="1.5rem" style={{display: "none"}}>
                                        <Input
                                            {...register('billing.province')}
                                            placeholder={t('orderForm.placeholders.province')}
                                            label={t('orderForm.province')}
                                            error={errors.billing?.province}
                                            required
                                            defaultValue={"BD"}
                                        />
                                        <Input
                                            {...register('billing.postalCode')}
                                            placeholder={t('orderForm.placeholders.postalCode')}
                                            label={t('orderForm.postalCode')}
                                            error={errors.billing?.postalCode}
                                            required
                                            defaultValue={"0000"}
                                        />
                                    </Stack>
                                    <Stack w100 gap="1.5rem" style={{display: "none"}}>
                                        <Input
                                            {...register('billing.company')}
                                            placeholder={t('orderForm.placeholders.company')}
                                            label={t('orderForm.company')}
                                            error={errors.billing?.company}
                                        />
                                        {availableCountries && (
                                            <CountrySelect
                                                {...register('billing.countryCode')}
                                                placeholder={t('orderForm.placeholders.countryCode')}
                                                label={t('orderForm.countryCode')}
                                                defaultValue={countryCode}
                                                options={availableCountries}
                                                error={errors.billing?.countryCode}
                                                required
                                            />
                                        )}
                                    </Stack>
                                </Stack>
                            </BillingWrapper>
                        </Stack>

                        <Stack justifyBetween itemsCenter style={{display: "none"}}>
                            {/* <CheckBox
                        {...register('userNeedInvoice', {
                            onChange: e => {
                                setValue('userNeedInvoice', e.target.checked);
                                setValue('NIP', '');
                            },
                        })}
                        label={t('orderForm.userNeedInvoice')}
                    /> */}
                            <CheckBox
                                {...register('shippingDifferentThanBilling')}
                                checked={watch('shippingDifferentThanBilling')}
                                label={t('orderForm.shippingDifferentThanBilling')}
                            />
                        </Stack>

                        {/* NIP */}
                        {/* <AnimatePresence>
                    {watch('userNeedInvoice') && (
                        <FVInputWrapper
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.2 }}>
                            <Input
                                {...register('NIP')}
                                label={t('orderForm.NIP')}
                                error={errors.NIP}
                                placeholder="NIP"
                                required
                            />
                        </FVInputWrapper>
                    )}
                </AnimatePresence> */}

                        {/* Billing Part */}
                        <AnimatePresence>
                            {watch('shippingDifferentThanBilling') && (
                                <ShippingWrapper
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    transition={{ duration: 0.2 }}>
                                    <TH2 size="2rem" weight={500} style={{ marginBottom: '1.75rem' }}>
                                        {t('orderForm.shippingInfo')}
                                    </TH2>
                                    <Stack column>
                                        <Stack w100 gap="1.75rem">
                                            <Input
                                                {...register('shipping.fullName')}
                                                label={t('orderForm.fullName')}
                                                error={errors.shipping?.fullName}
                                                required
                                            />
                                            <Input
                                                {...register('shipping.company')}
                                                label={t('orderForm.company')}
                                                error={errors.shipping?.company}
                                            />
                                        </Stack>
                                        <Stack w100 gap="1.75rem">
                                            <Input
                                                {...register('shipping.streetLine1')}
                                                label={t('orderForm.streetLine1')}
                                                error={errors.shipping?.province}
                                                required
                                            />
                                            <Input
                                                {...register('shipping.streetLine2')}
                                                label={t('orderForm.streetLine2')}
                                                error={errors.shipping?.postalCode}
                                                required
                                            />
                                        </Stack>
                                        <Stack w100 gap="1.75rem">
                                            <Input
                                                {...register('shipping.city')}
                                                label={t('orderForm.city')}
                                                error={errors.shipping?.city}
                                                required
                                            />
                                            {availableCountries && (
                                                <CountrySelect
                                                    {...register('shipping.countryCode')}
                                                    label={t('orderForm.countryCode')}
                                                    defaultValue={countryCode}
                                                    options={availableCountries}
                                                    error={errors.shipping?.countryCode}
                                                    required
                                                />
                                            )}
                                        </Stack>
                                        <Stack gap="1.75rem">
                                            <Input
                                                {...register('shipping.province')}
                                                label={t('orderForm.province')}
                                                error={errors.shipping?.province}
                                                required
                                            />
                                            <Input
                                                {...register('shipping.postalCode')}
                                                label={t('orderForm.postalCode')}
                                                error={errors.shipping?.postalCode}
                                                required
                                            />
                                        </Stack>
                                    </Stack>
                                </ShippingWrapper>
                            )}
                        </AnimatePresence>

                        {/* Create Account */}
                        {!activeCustomer?.id ? (
                            <Stack column gap="1.25rem" style={{display: "none"}}>
                                <Stack itemsCenter gap="1rem">
                                    <CheckBox {...register('createAccount')} label={t('orderForm.createAccount')} />
                                    <Stack itemsCenter justifyCenter>
                                        <Tooltip text={t('orderForm.whatAccountGives')}>
                                            <Info size={12} />
                                        </Tooltip>
                                    </Stack>
                                </Stack>
                                {watch('createAccount') && (
                                    <CreateAccountWrapper
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        exit={{ opacity: 0 }}
                                        transition={{ duration: 0.2 }}>
                                        <Input
                                            {...register('password')}
                                            type="password"
                                            label={t('orderForm.password')}
                                            error={errors.password}
                                            required
                                        />
                                        <Input
                                            {...register('confirmPassword')}
                                            type="password"
                                            label={t('orderForm.confirmPassword')}
                                            error={errors.confirmPassword}
                                            required
                                        />
                                    </CreateAccountWrapper>
                                )}
                            </Stack>
                        ) : null}

                        {/* Submit */}
                        <Stack column justifyBetween gap="0.5rem">
                            <CheckBox
                                {...register('terms')}
                                // error={errors.terms}
                                label={
                                    <Trans
                                        i18nKey="orderForm.terms"
                                        t={t}
                                        components={{
                                            1: <Link style={{ zIndex: 2, position: 'relative' }} href="/checkout" />,
                                        }}
                                    />
                                }
                                required
                                checked={true}
                            />
                            <AnimatePresence>
                                {errors.terms?.message && (
                                    <FormError
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        exit={{ opacity: 0 }}
                                        transition={{ duration: 0.2 }}>
                                        {errors.terms?.message}
                                    </FormError>
                                )}
                            </AnimatePresence>
                        </Stack>
                    </Stack>
                    
                </Container>
            </Form>
        </Stack>
    );
};

const Container = styled(Stack)`
    flex-direction: column-reverse;

    @media (min-width: ${({ theme }) => theme.breakpoints.lg}) {
        flex-direction: row-reverse;
    }
`;
const DeliveryMethodWrapper = styled(Stack)``;

const LinkButton = styled(Link)`
    width: 100%;
    text-align: center;
    color: ${p => p.theme.text.main};
    text-transform: uppercase;
    font-size: 1.5rem;
    font-weight: 600;
`;

const StyledButton = styled(Button)`
    width: 100%;
`;

const ShopNowButton = styled(Link)`
    display: block;
    width: 100%;
    padding: 0.75rem 2rem;
    background: linear-gradient(45deg, #00B5D6, #00D1B2, #FF8C42, #FFCD42);
    background-size: 300% 300%;
    color: white;
    text-align: center;
    text-transform: uppercase;
    font-size: 1.5rem;
    font-weight: 600;
    transition: background-position 0.5s, transform 0.1s, box-shadow 0.1s;
    box-shadow: 0 6px 10px rgba(0, 0, 0, 0.2), inset 0 -4px 6px rgba(0, 0, 0, 0.1);

    &:hover {
        background-position: 100% 0;
        box-shadow: 0 8px 12px rgba(0, 0, 0, 0.25), inset 0 -4px 6px rgba(0, 0, 0, 0.1);
    }

    &:active {
        transform: translateY(2px);
        box-shadow: 0 3px 6px rgba(0, 0, 0, 0.1), inset 0 -2px 3px rgba(0, 0, 0, 0.1);
    }
`;

const BuyNowButton = styled(Button)`
    width: 100%;
    padding: 0.75rem 2rem;
    background: linear-gradient(45deg, #00D1B2, #00B5D6, #FF8C42, #FFCD42);
    background-size: 300% 300%;
    color: white;
    text-transform: uppercase;
    font-size: 1.5rem;
    font-weight: 600;
    transition: background-position 0.5s, transform 0.1s, box-shadow 0.1s;
    box-shadow: 0 6px 10px rgba(0, 0, 0, 0.2), inset 0 -4px 6px rgba(0, 0, 0, 0.1);

    &:hover {
        background-position: 100% 0;
        box-shadow: 0 8px 12px rgba(0, 0, 0, 0.25), inset 0 -4px 6px rgba(0, 0, 0, 0.1);
    }

    &:active {
        transform: translateY(2px);
        box-shadow: 0 3px 6px rgba(0, 0, 0, 0.1), inset 0 -2px 3px rgba(0, 0, 0, 0.1);
    }
`;

const BackButton = styled(Link)`
    background-color: transparent;
    border: none;
    cursor: pointer;
    padding: 0;
    margin: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 3.2rem;
    height: 3.2rem;

    color: ${({ theme }) => theme.gray(1000)};

    @media (max-width: ${({ theme }) => theme.breakpoints.lg}) {
        display: none;
    }
`;

const EmptyCartDescription = styled.div`
    font-size: 1.75rem;

    & > a {
        font-weight: 500;
        font-size: 1.75rem;
        color: ${p => p.theme.accent(800)};
        text-decoration: underline;
    }
`;

const BillingWrapper = styled(Stack)`
    margin-top: 1.75rem;
`;

const CreateAccountWrapper = styled(motion.div)`
    display: flex;
    gap: 1.25rem;
`;

const ShippingWrapper = styled(motion.div)`
    display: flex;
    flex-direction: column;
    gap: 1.75rem;
    margin-top: 1.75rem;
`;

// const FVInputWrapper = styled(motion.div)`
//     margin-top: 1.75rem;
//     position: relative;
// `;

const Form = styled.form`
    margin-top: 1.6rem;
`;

