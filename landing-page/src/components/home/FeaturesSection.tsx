import schedulePickupImg from '../../assets/images/heroes/schedule-pickup.png'
import fastReliableImg from '../../assets/images/heroes/fast-reliable.png'
import premiumLaundryImg from '../../assets/images/heroes/premium-laundry.png'
import expressPickupIcon from '../../assets/images/icons/express-pickup.svg'
import scheduleLaterIcon from '../../assets/images/icons/schedule-later.svg'

export function FeaturesSection() {
  return (
    <section className="mt-16 w-full space-y-20 sm:mt-24 sm:space-y-24 lg:space-y-28">
      {/* Feature 1: Schedule Your Pick up — image left, text right */}
      <div className="flex flex-col items-center gap-8 sm:gap-12 md:flex-row md:gap-16">
        <div className="flex w-full justify-center md:w-full">
          <img
            src={schedulePickupImg}
            alt="Schedule your pickup"
            className="w-full max-w-[18rem] object-contain sm:max-w-[21rem] lg:max-w-[35rem]"
          />
        </div>
        <div className="w-full md:w-full">
          <div className="mx-auto max-w-3xl text-center md:mx-0 md:text-end">
            <h2 className="font-['Unbounded'] text-2xl font-medium text-[#004375] sm:text-3xl lg:text-5xl">
              Schedule Your Pick up
            </h2>
            <p className="mt-12  w-min-[40] text-end font-['Montserrat'] text-sm lg:text-xl leading-relaxed text-[#333] sm:text-base">
              Pick a time, we pick it up. Fresh, folded, and{' '}
              <span className="block self-end">
                delivered without the hassle.
              </span>
            </p>
            <div className="mt-25 ">
              <p className="w-full text-right font-['Montserrat'] text-sm font-light text-black">
                Select from options
              </p>

              <div className="mt-5 flex w-full justify-end flex-col items-stretch gap-10 sm:flex-row sm:flex-wrap sm:items-end">
                <button className="inline-flex w-full cursor-pointer items-center justify-center gap-2 xl:rounded-lg bg-[#004375] px-5 py-3 font-['Montserrat'] text-sm font-semibold text-white shadow-sm shadow-[#004375]/15 transition-all duration-150 hover:-translate-y-0.5 hover:bg-[#003460] hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#004375] focus-visible:ring-offset-2 sm:w-auto">
                  <img
                    src={expressPickupIcon}
                    alt=""
                    className="h-4 w-4 shrink-0"
                  />
                  Express pickup
                </button>

                <div className="group mx-auto flex w-fit max-w-full flex-col items-center sm:mx-0 sm:items-start">
                  <button className="inline-flex cursor-pointer items-center justify-center gap-2 px-1 font-['Montserrat'] text-sm font-medium text-[#555] transition-colors duration-150 hover:text-[#004375] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#004375] focus-visible:ring-offset-2">
                    <img
                      src={scheduleLaterIcon}
                      alt=""
                      className="h-4 w-4 shrink-0"
                    />
                    Schedule later
                  </button>
                  <span className="mt-2 h-px w-full rounded-full bg-[#004375]/20 transition-colors duration-150 group-hover:bg-[#004375]/45" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Feature 2: Fast & Reliable Delivery — text left, image right */}
      <div className="flex flex-col items-center gap-8 sm:gap-12 md:flex-row-reverse md:gap-16">
        <div className="flex w-full justify-center md:w-1/2">
          <img
            src={fastReliableImg}
            alt="Fast and reliable delivery"
            className="w-full max-w-[18rem] object-contain sm:max-w-84 lg:max-w-[25rem]"
          />
        </div>
        <div className="w-full md:w-1/2">
          <div className="mx-auto max-w-xl text-center md:text-left">
            <h2 className="font-['Unbounded'] text-2xl font-semibold text-[#004375] sm:text-3xl lg:text-4xl">
              Fast & Reliable Delivery
            </h2>
            <p className="mt-4 lg:mt-8 font-['Montserrat'] text-sm lg:text-lg leading-relaxed text-[#333] sm:text-base">
              Get your laundry back fresh and folded on time{' '}
              <span className="lg:block ">
                in every time. Fast, reliable, and hassle-free.
              </span>
            </p>
          </div>
        </div>
      </div>

      {/* Feature 3: Premium Laundry Care — image left, text right */}
      <div className="flex flex-col  items-center gap-8 sm:gap-12 md:flex-row md:gap-16">
        <div className="flex mx-auto lg:max-w-2xl  w-full justify-center md:w-1/2">
          <img
            src={premiumLaundryImg}
            alt="Premium laundry care"
            className="w-full max-w-[18rem] object-contain sm:max-w-[21rem] lg:max-w-[30rem]"
          />
        </div>
        <div className="w-full md:w-full">
          <div className="mx-auto max-w-3xl text-center md:mx-0 md:text-end">
            <h2 className="font-['Unbounded'] text-2xl font-semibold text-[#004375] sm:text-3xl lg:text-5xl">
              Premium Laundry Care
            </h2>
            <p className="mt-4 font-['Montserrat'] text-sm  lg:text-lg leading-relaxed text-[#333] sm:text-base">
              We treat every fabric with care, using quality{' '}
              <span className="lg:block">
                {' '}
                detergents and professional techniques for the best
                results.{' '}
              </span>
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}
