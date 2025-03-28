import { SSRQuery } from '@/src/graphql/client';
import {
    ActiveCustomerSelector,
    ActiveOrderSelector,
    AvailableCountriesSelector,
    ShippingMethodsSelector,
    homePageSlidersSelector,
    AvailablePaymentMethodsSelector 
} from '@/src/graphql/selectors';
import { makeServerSideProps } from '@/src/lib/getStatic';
import { redirectFromDefaultChannelSSR, prepareSSRRedirect } from '@/src/lib/redirect';
import { GetServerSidePropsContext } from 'next';

export const getServerSideProps = async (context: GetServerSidePropsContext) => {
    const r = await makeServerSideProps(['common', 'checkout'])(context);
    const translationRedirect = redirectFromDefaultChannelSSR(context);
    if (translationRedirect) return translationRedirect;

    // const homePageRedirect = prepareSSRRedirect('/')(context);
    // const paymentRedirect = prepareSSRRedirect('/checkout/payment')(context);
    const api = SSRQuery(context);

    try {
        const [
            { activeOrder: checkout },
            { availableCountries },
            { activeCustomer },
            { eligibleShippingMethods },
            { collection: alsoBoughtProducts },
            // { eligiblePaymentMethods }
            
        ] = await Promise.all([
            api({ activeOrder: ActiveOrderSelector }),
            api({ availableCountries: AvailableCountriesSelector }),
            api({ activeCustomer: ActiveCustomerSelector }),
            api({ eligibleShippingMethods: ShippingMethodsSelector }),
            api({ collection: [{ slug: 'all' }, homePageSlidersSelector] }),
            // api({ eligiblePaymentMethods: AvailablePaymentMethodsSelector }),
        ]);

        // if (checkout?.state === 'ArrangingPayment') {
        //     return paymentRedirect;
        // }

        // if (!checkout || checkout.lines.length === 0) {
        //     return homePageRedirect;
        // }
        console.log("checkout->getServerSideProps",activeCustomer);
        const returnedStuff = {
            ...r.props,
            ...r.context,
            availableCountries,
            checkout,
            alsoBoughtProducts: alsoBoughtProducts?.productVariants.items ?? null,
            activeCustomer: activeCustomer ?? null,
            eligibleShippingMethods: eligibleShippingMethods ?? null,
            // eligiblePaymentMethods: eligiblePaymentMethods ?? [],
        };

        return { props: returnedStuff };
    } catch (e) {
        // return homePageRedirect;
    }
};
